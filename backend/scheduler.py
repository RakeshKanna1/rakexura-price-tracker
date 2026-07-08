import logging
import asyncio
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from database import get_collection
from cheapshark import get_game_details_from_api

logger = logging.getLogger("rakexura-backend")

scheduler = AsyncIOScheduler()

async def update_single_game_prices(game: dict):
    """
    Fetch and update pricing info for a single game, saving history and checking alerts
    """
    cheapshark_id = game["cheapshark_id"]
    game_name = game["name"]
    
    try:
        # Fetch fresh data from CheapShark (base USD for database storage)
        details = await get_game_details_from_api(cheapshark_id, region="US")
        current_price = details["lowest_price"]
        lowest_ever = details["cheapest_ever"]
        
        # Find original price, discount percent, and platform of the cheapest deal
        cheapest_deal = details["platform_prices"][0] if details["platform_prices"] else None
        orig_price = cheapest_deal["original_price"] if cheapest_deal else current_price
        disc_percent = cheapest_deal["discount_percent"] if cheapest_deal else 0.0
        platform_name = cheapest_deal["platform"] if cheapest_deal else "Steam"
        
        # 1. Update the tracked game status
        games_col = get_collection("games")
        await games_col.update_one(
            {"cheapshark_id": cheapshark_id},
            {
                "$set": {
                    "current_price": current_price,
                    "lowest_ever_price": lowest_ever,
                    "original_price": orig_price,
                    "discount_percent": disc_percent,
                    "platform": platform_name,
                    "last_checked": datetime.utcnow()
                }
            }
        )
        
        # 2. Record this update in price history
        history_col = get_collection("price_history")
        await history_col.insert_one({
            "cheapshark_id": cheapshark_id,
            "game_name": game_name,
            "price": current_price,
            "timestamp": datetime.utcnow()
        })
        
        # 3. Check for triggered alerts
        alerts_col = get_collection("alerts")
        cursor = await alerts_col.find({"cheapshark_id": cheapshark_id, "is_active": True})
        alerts = await cursor.to_list(length=100)
        
        logs_col = get_collection("logs")
        for alert in alerts:
            target_price = alert["target_price"]
            if current_price <= target_price:
                # Trigger the alert
                await alerts_col.update_one(
                    {"_id": alert["_id"]},
                    {"$set": {"is_active": False, "triggered_at": datetime.utcnow()}}
                )
                # Log the alert trigger event
                await logs_col.insert_one({
                    "event_type": "ALERT_TRIGGERED",
                    "game_name": game_name,
                    "message": f"🚨 Price Alert! '{game_name}' has dropped to ₹{round(current_price * 83.0, 2)} (Target: ₹{round(target_price * 83.0, 2)})",
                    "timestamp": datetime.utcnow()
                })
                logger.info(f"Alert triggered for {game_name}: Price {current_price} <= Target {target_price}")
                
        # Log successful update
        await logs_col.insert_one({
            "event_type": "PRICE_UPDATED",
            "game_name": game_name,
            "message": f"Updated price for '{game_name}': Current ₹{round(current_price * 83.0, 2)}",
            "timestamp": datetime.utcnow()
        })
        
    except Exception as e:
        logger.error(f"Failed to background-update price for {game_name}: {e}")
        logs_col = get_collection("logs")
        await logs_col.insert_one({
            "event_type": "UPDATE_ERROR",
            "game_name": game_name,
            "message": f"Failed to update price for '{game_name}': {str(e)}",
            "timestamp": datetime.utcnow()
        })

async def update_all_prices():
    """
    Run update for all tracked wishlist games
    """
    logger.info("Starting background price update job...")
    games_col = get_collection("games")
    cursor = await games_col.find()
    games = await cursor.to_list(length=1000)
    
    if not games:
        logger.info("No games in wishlist to update.")
        return
        
    for game in games:
        await update_single_game_prices(game)
        # Avoid hitting API rate limits
        await asyncio.sleep(1.0)
        
    logger.info("Background price update job complete.")

def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(update_all_prices, 'interval', hours=6, id='price_updater')
        scheduler.start()
        logger.info("APScheduler started: Price updates scheduled every 6 hours.")

def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("APScheduler stopped.")
