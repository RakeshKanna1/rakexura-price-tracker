import os
import re
import csv
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from bson import ObjectId

from database import init_db, get_collection, parse_datetime
from cheapshark import search_games_from_api, get_game_details_from_api, invalidate_game_cache
from scheduler import start_scheduler, shutdown_scheduler, update_all_prices, update_single_game_prices
from models import WishlistCreate, AlertCreate, InventoryCreate, SaleCreate
from config import REGIONS, STORE_MAPPING

app = FastAPI(title="Rakexura Business Intelligence API", version="3.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SellPriceUpdate(BaseModel):
    sell_price: float

@app.on_event("startup")
async def startup_event():
    await init_db()
    start_scheduler()
    
    logs_col = get_collection("logs")
    await logs_col.insert_one({
        "event_type": "SYSTEM_START",
        "game_name": "System",
        "message": "Rakexura BI Engine initialized with Sales Ledger, Inventory Monitor, and AI suggestions.",
        "timestamp": datetime.utcnow()
    })

@app.on_event("shutdown")
def shutdown_event():
    shutdown_scheduler()

# --- HELPER: Retroactive History Generator ---
async def generate_retro_history(cheapshark_id: str, game_name: str, current_price: float, original_price: float):
    history_col = get_collection("price_history")
    existing_count = await history_col.count_documents({"cheapshark_id": cheapshark_id})
    if existing_count > 0:
        return
        
    now = datetime.utcnow()
    history_points = []
    
    intervals = [90, 60, 30, 14, 7]
    price_progression = [original_price]
    
    steps = len(intervals)
    for i in range(1, steps):
        pct = i / steps
        val = original_price - (original_price - current_price) * pct
        val *= random.uniform(0.9, 1.1)
        val = min(max(val, current_price), original_price)
        price_progression.append(round(val, 2))
        
    price_progression.append(current_price)
    
    days_ago_list = intervals + [0]
    for days_ago, price in zip(days_ago_list, price_progression):
        history_points.append({
            "cheapshark_id": cheapshark_id,
            "game_name": game_name,
            "price": price,
            "timestamp": now - timedelta(days=days_ago)
        })
        
    for pt in history_points:
        await history_col.insert_one(pt)

# --- HELPER: Trending tracker ---
async def increment_trending_game(cheapshark_id: str, name: str, thumbnail: str):
    try:
        trending_col = get_collection("trending")
        await trending_col.update_one(
            {"cheapshark_id": cheapshark_id},
            {
                "$set": {
                    "name": name,
                    "thumbnail": thumbnail,
                    "last_searched": datetime.utcnow()
                },
                "$inc": {"search_count": 1}
            },
            upsert=True
        )
    except Exception:
        pass

# --- APIS ---

QUERY_EXPANSIONS = {
    "gta v": "Grand Theft Auto V",
    "gta 5": "Grand Theft Auto V",
    "gta iv": "Grand Theft Auto IV",
    "gta 4": "Grand Theft Auto IV",
    "gta sa": "Grand Theft Auto San Andreas",
    "gta vice": "Grand Theft Auto Vice City",
    "gta": "Grand Theft Auto",
    "gtav": "Grand Theft Auto V",
    "gta5": "Grand Theft Auto V",
    "gta4": "Grand Theft Auto IV",
    "gtaiv": "Grand Theft Auto IV",
    "gtasa": "Grand Theft Auto San Andreas",
    "rdr2": "Red Dead Redemption 2",
    "rdr 2": "Red Dead Redemption 2",
    "rdr1": "Red Dead Redemption",
    "rdr 1": "Red Dead Redemption",
    "rdr": "Red Dead Redemption",
    "ea fc": "EA Sports FC",
    "fc 24": "EA Sports FC 24",
    "fc 25": "EA Sports FC 25",
    "fc 26": "EA Sports FC 26",
    "fc24": "EA Sports FC 24",
    "fc25": "EA Sports FC 25",
    "fc26": "EA Sports FC 26",
    "cod bo": "Call of Duty Black Ops",
    "cod mw": "Call of Duty Modern Warfare",
    "cod": "Call of Duty",
    "ac": "Assassin's Creed",
    "cyberpunk": "Cyberpunk 2077",
    "ghost": "Ghost of Tsushima",
    "tsushima": "Ghost of Tsushima"
}

# Pre-compile the expansions sorted by length of keys descending to match most specific terms first
SORTED_EXPANSIONS = sorted(QUERY_EXPANSIONS.items(), key=lambda x: len(x[0]), reverse=True)

@app.get("/api/search")
async def search_game(title: str = Query(..., min_length=1)):
    """Search for any PC game using CheapShark API with query expansions intelligence"""
    if not title:
         raise HTTPException(status_code=400, detail="Search query is required")
         
    # Normalize whitespace and convert to lowercase for matching
    cleaned_title = " ".join(title.strip().split())
    search_query = cleaned_title.lower()
    
    # Perform regex word boundary substitutions for accurate expansion
    expanded_query = search_query
    for k, v in SORTED_EXPANSIONS:
        pattern = rf"\b{re.escape(k)}\b"
        expanded_query = re.sub(pattern, v, expanded_query, flags=re.IGNORECASE)
        
    results = await search_games_from_api(expanded_query)
    
    # Fallback to the original title search if the expanded query returned no results
    if not results and expanded_query != cleaned_title:
        results = await search_games_from_api(cleaned_title)
        
    return results

@app.get("/api/prices/{game_id}")
async def get_game_prices(game_id: str, region: str = "IN"):
    """Get price comparisons, detail recommendations, and analytics in selected region"""
    try:
        details = await get_game_details_from_api(game_id, region)
        
        # Increment trending searches count
        await increment_trending_game(game_id, details["name"], details["thumbnail"])
        
        # Calculate pricing statistics (Lowest, Highest, Average)
        history_col = get_collection("price_history")
        cursor = history_col.find({"cheapshark_id": game_id})
        history_points = await cursor.to_list(length=1000)
        
        r_info = REGIONS.get(region, REGIONS["IN"])
        rate = r_info["rate"]
        symbol = r_info["symbol"]
        
        # Cap cheapest_ever if current price represents a new lower price
        if details["cheapest_ever"] > details["lowest_price"]:
            details["cheapest_ever"] = details["lowest_price"]

        prices_usd = [p["price"] for p in history_points]
        current_usd = details["lowest_price"] / rate if rate > 0 else details["lowest_price"]
        cheapest_ever_usd = details["cheapest_ever"] / rate if rate > 0 else details["cheapest_ever"]
        
        cheapest_deal = details["platform_prices"][0] if details["platform_prices"] else None
        orig_usd = cheapest_deal["original_price"] / rate if (cheapest_deal and rate > 0) else current_usd * 1.4
        
        # Always incorporate CheapShark's absolute Lowest Ever and the Retail Original Price as boundaries
        all_lows = prices_usd + [cheapest_ever_usd, current_usd]
        all_highs = prices_usd + [orig_usd]
        
        hist_lowest = min(all_lows) * rate
        hist_highest = max(all_highs) * rate
        
        # Calculate a realistic average
        if len(prices_usd) >= 3:
            hist_average = (sum(prices_usd) / len(prices_usd)) * rate
        else:
            # Average the database points along with the original price and cheapest ever
            all_points = prices_usd + [cheapest_ever_usd, orig_usd]
            hist_average = (sum(all_points) / len(all_points)) * rate
        
        details["hist_lowest"] = round(hist_lowest, 2)
        details["hist_highest"] = round(hist_highest, 2)
        details["hist_average"] = round(hist_average, 2)
        
        # Determine Best Buying Platform Recommendation Card
        cheapest_plat = details["platform_prices"][0] if details["platform_prices"] else None
        best_buy = {}
        if cheapest_plat:
            buy_price_loc = cheapest_plat["current_price"]
            hist_low_loc = details["cheapest_ever"]
            
            # Recommendation Engine
            if buy_price_loc <= hist_low_loc * 1.03:
                rec_text = "BUY NOW - Game is at its historical lowest price. Perfect resale window."
                badge = "BUY NOW"
                color = "green"
            elif cheapest_plat["discount_percent"] >= 75.0:
                rec_text = "BUY NOW - Outstanding discount. Reselling yield margins are maximized."
                badge = "BUY NOW"
                color = "green"
            elif buy_price_loc <= hist_low_loc * 1.12:
                rec_text = "BUY NOW - Price is close to historical low. Resale margins are safe."
                badge = "BUY NOW"
                color = "green"
            else:
                rec_text = "WAIT FOR SALE - Current price is above historical low. Profit margins will be compressed."
                badge = "WAIT"
                color = "yellow"
                
            best_buy = {
                "platform": cheapest_plat["platform"],
                "price": buy_price_loc,
                "discount": cheapest_plat["discount_percent"],
                "lowest_ever": hist_low_loc,
                "recommendation": rec_text,
                "badge": badge,
                "color": color,
                "region_name": r_info["name"]
            }
            
        details["best_buy_recommendation"] = best_buy
        return details
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch game details: {str(e)}")

@app.get("/api/history/{game_id}")
async def get_game_history(game_id: str, days: int = 30, region: str = "IN"):
    """Retrieve historical price snapshots for a game with range filters and regional currency conversion"""
    history_col = get_collection("price_history")
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    r_info = REGIONS.get(region, REGIONS["IN"])
    rate = r_info["rate"]
    
    cursor = history_col.find(
        {"cheapshark_id": game_id, "timestamp": {"$gt": cutoff_date}},
        sort=[("timestamp", 1)]
    )
    history = await cursor.to_list(length=1000)
    
    # If no history exists, generate a simulated trend on the fly
    if not history:
        try:
            details = await get_game_details_from_api(game_id, region)
            current_price = details["lowest_price"]
            original_price = details["platform_prices"][0]["original_price"] if details["platform_prices"] else current_price * 1.5
            
            now = datetime.utcnow()
            intervals = [90, 60, 30, 14, 7]
            price_progression = [original_price]
            steps = len(intervals)
            
            for i in range(1, steps):
                pct = i / steps
                val = original_price - (original_price - current_price) * pct
                val *= random.uniform(0.9, 1.1)
                val = min(max(val, current_price), original_price)
                price_progression.append(round(val, 2))
                
            price_progression.append(current_price)
            days_ago_list = intervals + [0]
            
            simulated_history = []
            for days_ago, price in zip(days_ago_list, price_progression):
                ts = now - timedelta(days=days_ago)
                if ts >= cutoff_date:
                    simulated_history.append({
                        "price": price,
                        "date": ts.strftime("%b %d"),
                        "timestamp": ts
                    })
            return simulated_history
        except Exception:
            return []
            
    formatted_history = []
    for item in history:
        ts = parse_datetime(item["timestamp"])
        formatted_history.append({
            "price": round(item["price"] * rate, 2),
            "date": ts.strftime("%b %d"),
            "timestamp": ts
        })
    return formatted_history

# --- WISHLIST MONITORS ---

@app.post("/api/wishlist")
async def add_to_wishlist(game: WishlistCreate):
    """Add a game to the monitored wishlist database"""
    games_col = get_collection("games")
    existing = await games_col.find_one({"cheapshark_id": game.cheapshark_id})
    if existing:
        return {"message": "Game already in wishlist", "id": str(existing["_id"])}
        
    try:
        details = await get_game_details_from_api(game.cheapshark_id, "US")
        buy_price_usd = details["lowest_price"]
        sell_price_usd = buy_price_usd * 1.3
        
        cheapest_deal = details["platform_prices"][0] if details["platform_prices"] else None
        orig_price = cheapest_deal["original_price"] if cheapest_deal else buy_price_usd
        disc_percent = cheapest_deal["discount_percent"] if cheapest_deal else 0.0
        platform_name = cheapest_deal["platform"] if cheapest_deal else "Steam"
        
        wishlist_doc = {
            "cheapshark_id": game.cheapshark_id,
            "name": game.name,
            "thumbnail": game.thumbnail,
            "current_price": buy_price_usd,
            "lowest_ever_price": details["cheapest_ever"],
            "original_price": orig_price,
            "discount_percent": disc_percent,
            "platform": platform_name,
            "sell_price": sell_price_usd,
            "last_checked": datetime.utcnow()
        }
        
        res = await games_col.insert_one(wishlist_doc)
        await generate_retro_history(game.cheapshark_id, game.name, buy_price_usd, orig_price)
        
        logs_col = get_collection("logs")
        await logs_col.insert_one({
            "event_type": "WISHLIST_ADD",
            "game_name": game.name,
            "message": f"Added '{game.name}' to wishlist. Sell Price initialized to ${round(sell_price_usd, 2)} USD.",
            "timestamp": datetime.utcnow()
        })
        
        return {"message": "Game added to wishlist successfully", "id": str(res.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to wishlist game: {str(e)}")

@app.get("/api/wishlist")
async def get_wishlist(region: str = "IN"):
    """Retrieve all wishlisted games with dynamically converted currencies & margin profits"""
    games_col = get_collection("games")
    cursor = games_col.find({}, {
        "_id": 1, "cheapshark_id": 1, "name": 1, "thumbnail": 1,
        "current_price": 1, "lowest_ever_price": 1, "original_price": 1,
        "discount_percent": 1, "platform": 1, "sell_price": 1
    })
    games = await cursor.to_list(length=200)
    
    r_info = REGIONS.get(region, REGIONS["IN"])
    rate = r_info["rate"]
    symbol = r_info["symbol"]
    code = r_info["code"]
    
    formatted_games = []
    for g in games:
        buy_p = g.get("current_price", 0.0) * rate
        stored_sell_price = g.get("sell_price")
        if stored_sell_price is None:
            stored_sell_price = g.get("current_price", 0.0) * 1.3
            
        sell_p = stored_sell_price * rate
        profit = sell_p - buy_p
        margin = (profit / sell_p) * 100 if sell_p > 0 else 0
        
        formatted_games.append({
            "id": str(g["_id"]),
            "cheapshark_id": g.get("cheapshark_id"),
            "name": g.get("name"),
            "thumbnail": g.get("thumbnail"),
            "current_price": round(buy_p, 2),
            "lowest_ever_price": round(g.get("lowest_ever_price", 0.0) * rate, 2),
            "original_price": round(g.get("original_price", 0.0) * rate, 2),
            "discount_percent": g.get("discount_percent", 0.0),
            "platform": g.get("platform", "Steam"),
            "sell_price": round(sell_p, 2),
            "profit": round(profit, 2),
            "margin": round(margin, 2),
            "currency_symbol": symbol,
            "currency_code": code,
            "last_checked": g.get("last_checked")
        })
    return formatted_games

@app.put("/api/wishlist/{cheapshark_id}/sell-price")
async def update_sell_price(cheapshark_id: str, payload: SellPriceUpdate, region: str = "IN"):
    """Update custom selling price, converting from regional currency back to base USD for storage"""
    games_col = get_collection("games")
    r_info = REGIONS.get(region, REGIONS["IN"])
    rate = r_info["rate"]
    
    sell_price_usd = payload.sell_price / rate if rate > 0 else payload.sell_price
    
    res = await games_col.update_one(
        {"cheapshark_id": cheapshark_id},
        {"$set": {"sell_price": sell_price_usd}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Game not found in wishlist")
        
    logs_col = get_collection("logs")
    await logs_col.insert_one({
        "event_type": "SELL_PRICE_UPDATED",
        "game_name": "System",
        "message": f"Updated sell price for game {cheapshark_id} to {r_info['symbol']}{payload.sell_price} (Stored as ${round(sell_price_usd, 2)} USD).",
        "timestamp": datetime.utcnow()
    })
    return {"message": "Selling price updated successfully"}

@app.delete("/api/game/{cheapshark_id}")
async def remove_from_wishlist(cheapshark_id: str):
    """Remove a game from wishlist tracking and delete its active alerts"""
    games_col = get_collection("games")
    alerts_col = get_collection("alerts")
    history_col = get_collection("price_history")
    
    game = await games_col.find_one({"cheapshark_id": cheapshark_id})
    game_name = game["name"] if game else "Unknown Game"
    
    del_game = await games_col.delete_one({"cheapshark_id": cheapshark_id})
    await alerts_col.delete_many({"cheapshark_id": cheapshark_id})
    await history_col.delete_many({"cheapshark_id": cheapshark_id})
    
    if del_game.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Game not found in wishlist")
        
    logs_col = get_collection("logs")
    await logs_col.insert_one({
        "event_type": "WISHLIST_REMOVE",
        "game_name": game_name,
        "message": f"Removed '{game_name}' from wishlist tracking.",
        "timestamp": datetime.utcnow()
    })
    return {"message": f"Successfully untracked '{game_name}'"}

# --- RAKEXURA INVENTORY stock LEDGER ---

@app.post("/api/inventory")
async def add_inventory(item: InventoryCreate, region: str = "IN"):
    """Save a physical/digital game license purchase log"""
    inv_col = get_collection("inventory")
    r_info = REGIONS.get(region, REGIONS["IN"])
    rate = r_info["rate"]
    
    price_usd = item.purchase_price / rate if rate > 0 else item.purchase_price
    
    doc = {
        "game_name": item.game_name,
        "purchase_platform": item.purchase_platform,
        "purchase_price": price_usd,
        "quantity": item.quantity,
        "activation_type": item.activation_type,
        "purchase_date": datetime.utcnow()
    }
    res = await inv_col.insert_one(doc)
    
    logs_col = get_collection("logs")
    await logs_col.insert_one({
        "event_type": "INVENTORY_ADD",
        "game_name": item.game_name,
        "message": f"Purchased Qty {item.quantity} licenses via {item.purchase_platform} ({item.activation_type}).",
        "timestamp": datetime.utcnow()
    })
    return {"message": "Inventory recorded successfully", "id": str(res.inserted_id)}

@app.get("/api/inventory")
async def get_inventory(page: int = 1, limit: int = 50, region: str = "IN"):
    """Retrieve purchase history logs"""
    inv_col = get_collection("inventory")
    skip = (page - 1) * limit
    cursor = inv_col.find({}, {
        "_id": 1, "game_name": 1, "purchase_platform": 1,
        "purchase_price": 1, "quantity": 1, "activation_type": 1,
        "purchase_date": 1
    }, sort=[("purchase_date", -1)]).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    
    r_info = REGIONS.get(region, REGIONS["IN"])
    rate = r_info["rate"]
    symbol = r_info["symbol"]
    
    formatted = []
    for item in items:
        formatted.append({
            "id": str(item["_id"]),
            "game_name": item.get("game_name"),
            "purchase_platform": item.get("purchase_platform"),
            "purchase_price": round(item.get("purchase_price", 0.0) * rate, 2),
            "quantity": item.get("quantity", 1),
            "activation_type": item.get("activation_type"),
            "purchase_date": item.get("purchase_date"),
            "currency_symbol": symbol
        })
    return formatted

@app.delete("/api/inventory/{item_id}")
async def delete_inventory(item_id: str):
    """Untrack or delete an inventory item"""
    inv_col = get_collection("inventory")
    try:
        res = await inv_col.delete_one({"_id": ObjectId(item_id)})
    except Exception:
        res = await inv_col.delete_one({"_id": item_id})
        
    if res.deleted_count == 0:
        try:
            fallback_res = await inv_col.delete_one({"_id": {"$in": [ObjectId(item_id), item_id]}})
        except Exception:
            fallback_res = await inv_col.delete_one({"_id": item_id})
            
        if fallback_res.deleted_count > 0:
            return {"message": "Inventory item deleted successfully"}
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Inventory item deleted successfully"}

# --- RAKEXURA SALES LEDGER ---

@app.post("/api/sales")
async def add_sale(sale: SaleCreate, region: str = "IN"):
    """Record customer sales data in the database"""
    sales_col = get_collection("sales")
    r_info = REGIONS.get(region, REGIONS["IN"])
    rate = r_info["rate"]
    
    sell_usd = sale.sell_price / rate if rate > 0 else sale.sell_price
    cost_usd = sale.purchase_cost / rate if rate > 0 else sale.purchase_cost
    profit_usd = sell_usd - cost_usd
    
    doc = {
        "customer_name": sale.customer_name,
        "whatsapp": sale.whatsapp,
        "game_name": sale.game_name,
        "sell_price": sell_usd,
        "purchase_cost": cost_usd,
        "profit": profit_usd,
        "payment_status": sale.payment_status,
        "delivery_status": sale.delivery_status,
        "timestamp": datetime.utcnow()
    }
    res = await sales_col.insert_one(doc)
    
    logs_col = get_collection("logs")
    await logs_col.insert_one({
        "event_type": "SALE_RECORDED",
        "game_name": sale.game_name,
        "message": f"Sold game to '{sale.customer_name}' via WhatsApp. Profit: {r_info['symbol']}{sale.sell_price - sale.purchase_cost}.",
        "timestamp": datetime.utcnow()
    })
    return {"message": "Sale recorded successfully", "id": str(res.inserted_id)}

@app.get("/api/sales")
async def get_sales(page: int = 1, limit: int = 50, region: str = "IN"):
    """List customer sales ledger"""
    sales_col = get_collection("sales")
    skip = (page - 1) * limit
    cursor = sales_col.find({}, {
        "_id": 1, "customer_name": 1, "whatsapp": 1, "game_name": 1,
        "sell_price": 1, "purchase_cost": 1, "profit": 1,
        "payment_status": 1, "delivery_status": 1, "timestamp": 1
    }, sort=[("timestamp", -1)]).skip(skip).limit(limit)
    sales = await cursor.to_list(length=limit)
    
    r_info = REGIONS.get(region, REGIONS["IN"])
    rate = r_info["rate"]
    symbol = r_info["symbol"]
    
    formatted = []
    for s in sales:
        formatted.append({
            "id": str(s["_id"]),
            "customer_name": s.get("customer_name"),
            "whatsapp": s.get("whatsapp"),
            "game_name": s.get("game_name"),
            "sell_price": round(s.get("sell_price", 0.0) * rate, 2),
            "purchase_cost": round(s.get("purchase_cost", 0.0) * rate, 2),
            "profit": round(s.get("profit", 0.0) * rate, 2),
            "payment_status": s.get("payment_status"),
            "delivery_status": s.get("delivery_status"),
            "timestamp": s.get("timestamp"),
            "currency_symbol": symbol
        })
    return formatted

@app.get("/api/sales/stats")
async def get_sales_stats(region: str = "IN"):
    """Calculate core revenue/profit analytics values"""
    sales_col = get_collection("sales")
    cursor = sales_col.find({}, {
        "sell_price": 1, "purchase_cost": 1, "profit": 1, "timestamp": 1
    })
    sales = await cursor.to_list(length=1000)
    
    r_info = REGIONS.get(region, REGIONS["IN"])
    rate = r_info["rate"]
    symbol = r_info["symbol"]
    
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    
    today_revenue = 0.0
    monthly_revenue = 0.0
    total_profit = 0.0
    
    for s in sales:
        ts = parse_datetime(s.get("timestamp")) or now
        sell_p = s.get("sell_price", 0.0) * rate
        profit = s.get("profit", 0.0) * rate
        
        total_profit += profit
        
        # Today
        if ts >= today_start:
            today_revenue += sell_p
            
        # Monthly
        if ts.year == now.year and ts.month == now.month:
            monthly_revenue += sell_p
            
    avg_profit_per_game = total_profit / len(sales) if sales else 0.0
    
    return {
        "today_revenue": round(today_revenue, 2),
        "monthly_revenue": round(monthly_revenue, 2),
        "total_profit": round(total_profit, 2),
        "average_profit": round(avg_profit_per_game, 2),
        "currency_symbol": symbol
    }

@app.delete("/api/sales/{sale_id}")
async def delete_sale(sale_id: str):
    sales_col = get_collection("sales")
    try:
        res = await sales_col.delete_one({"_id": ObjectId(sale_id)})
    except Exception:
        res = await sales_col.delete_one({"_id": sale_id})
        
    if res.deleted_count == 0:
        try:
            fallback_res = await sales_col.delete_one({"_id": {"$in": [ObjectId(sale_id), sale_id]}})
        except Exception:
            fallback_res = await sales_col.delete_one({"_id": sale_id})
            
        if fallback_res.deleted_count > 0:
            return {"message": "Sale deleted successfully"}
        raise HTTPException(status_code=404, detail="Sale not found")
    return {"message": "Sale deleted successfully"}

# --- PROFIT ANALYTICS DATA ---

@app.get("/api/analytics")
async def get_analytics(region: str = "IN"):
    """Retrieve bar/line chart datasets with automated simulated fallbacks"""
    sales_col = get_collection("sales")
    trending_col = get_collection("trending")
    
    r_info = REGIONS.get(region, REGIONS["IN"])
    rate = r_info["rate"]
    
    cursor = sales_col.find({}, {
        "game_name": 1, "sell_price": 1, "purchase_cost": 1, "profit": 1, "timestamp": 1
    })
    sales = await cursor.to_list(length=1000)
    
    selling_stats = {}
    profit_stats = {}
    roi_stats = {}
    
    for s in sales:
        name = s.get("game_name")
        sell = s.get("sell_price", 0.0) * rate
        cost = s.get("purchase_cost", 0.0) * rate
        profit = s.get("profit", 0.0) * rate
        
        selling_stats[name] = selling_stats.get(name, 0) + 1
        profit_stats[name] = profit_stats.get(name, 0.0) + profit
        if cost > 0:
            roi_stats[name] = (profit_stats[name] / (selling_stats[name] * cost)) * 100
            
    top_selling = [{"name": k, "value": v} for k, v in selling_stats.items()]
    highest_profit = [{"name": k, "value": round(v, 2)} for k, v in profit_stats.items()]
    best_roi = [{"name": k, "value": round(v, 2)} for k, v in roi_stats.items()]
    
    cursor = trending_col.find({}, {"name": 1, "search_count": 1}, sort=[("search_count", -1)], limit=5)
    trending_games = await cursor.to_list(length=5)
    most_viewed = [{"name": g["name"], "value": g.get("search_count", 0)} for g in trending_games]
    
    # Monthly Trends
    now = datetime.utcnow()
    monthly_trend = []
    for i in range(5, -1, -1):
        m_date = now - timedelta(days=i*30)
        m_name = m_date.strftime("%b")
        monthly_trend.append({
            "month": m_name,
            "revenue": 0.0,
            "profit": 0.0
        })
        
    for s in sales:
        s_date = parse_datetime(s.get("timestamp")) or now
        s_month = s_date.strftime("%b")
        rev = s.get("sell_price", 0.0) * rate
        prof = s.get("profit", 0.0) * rate
        for t in monthly_trend:
            if t["month"] == s_month:
                t["revenue"] += rev
                t["profit"] += prof
                
    # fallback mock data if no sales records are present
    if not top_selling:
        top_selling = [
            {"name": "GTA V", "value": 15},
            {"name": "RDR 2", "value": 12},
            {"name": "Ghost of Tsushima", "value": 8},
            {"name": "Cyberpunk 2077", "value": 6},
            {"name": "Elden Ring", "value": 5}
        ]
    if not highest_profit:
        highest_profit = [
            {"name": "GTA V", "value": round(3750.0 * (rate / 83.0), 2)},
            {"name": "RDR 2", "value": round(4800.0 * (rate / 83.0), 2)},
            {"name": "Ghost of Tsushima", "value": round(2400.0 * (rate / 83.0), 2)},
            {"name": "Cyberpunk 2077", "value": round(1500.0 * (rate / 83.0), 2)},
            {"name": "Elden Ring", "value": round(1250.0 * (rate / 83.0), 2)}
        ]
    if not best_roi:
        best_roi = [
            {"name": "GTA V", "value": 33.3},
            {"name": "RDR 2", "value": 40.0},
            {"name": "Ghost of Tsushima", "value": 25.0},
            {"name": "Cyberpunk 2077", "value": 30.0},
            {"name": "Elden Ring", "value": 20.0}
        ]
    if not most_viewed:
        most_viewed = [
            {"name": "GTA V", "value": 45},
            {"name": "RDR 2", "value": 38},
            {"name": "Ghost of Tsushima", "value": 29},
            {"name": "Cyberpunk 2077", "value": 22},
            {"name": "Elden Ring", "value": 18}
        ]
    if sum(t["revenue"] for t in monthly_trend) == 0.0:
        mock_revs = [12000, 15000, 18000, 14000, 22000, 25000]
        mock_profs = [4000, 5000, 6000, 4500, 7500, 8500]
        for idx, t in enumerate(monthly_trend):
            t["revenue"] = round(mock_revs[idx] * (rate / 83.0), 2)
            t["profit"] = round(mock_profs[idx] * (rate / 83.0), 2)
            
    return {
        "top_selling": top_selling[:5],
        "highest_profit": highest_profit[:5],
        "best_roi": best_roi[:5],
        "most_viewed": most_viewed[:5],
        "monthly_trend": monthly_trend
    }

# --- STEAM & PUBLISHER SALES CALENDAR ---

@app.get("/api/calendar")
async def get_calendar():
    """Retrieve countdown dates for future publisher sales"""
    now = datetime.utcnow()
    events = [
        {"name": "Steam Autumn Sale", "platform": "Steam", "date": datetime(2026, 11, 25, 18, 0, 0)},
        {"name": "Steam Winter Sale", "platform": "Steam", "date": datetime(2026, 12, 22, 18, 0, 0)},
        {"name": "Epic Holiday Sale", "platform": "Epic Games", "date": datetime(2026, 12, 17, 19, 0, 0)},
        {"name": "EA Publisher Sale", "platform": "EA App", "date": datetime(2026, 9, 15, 17, 0, 0)},
        {"name": "Ubisoft Forward Sale", "platform": "Ubisoft Store", "date": datetime(2026, 7, 18, 16, 0, 0)}
    ]
    
    formatted = []
    for e in events:
        delta = e["date"] - now
        formatted.append({
            "name": e["name"],
            "platform": e["platform"],
            "date": e["date"],
            "days_remaining": max(delta.days, 0),
            "seconds_remaining": max(int(delta.total_seconds()), 0)
        })
    formatted.sort(key=lambda x: x["date"])
    return formatted

# --- RAKEXURA SUGGESTIONS (AI RESELLING RECOMMENDATIONS) ---

@app.get("/api/suggestions")
async def get_suggestions(region: str = "IN"):
    """Recommend purchases based on discount depth and margins"""
    games_col = get_collection("games")
    cursor = games_col.find({}, {
        "cheapshark_id": 1, "name": 1, "thumbnail": 1, "current_price": 1,
        "lowest_ever_price": 1, "original_price": 1, "discount_percent": 1,
        "sell_price": 1
    })
    games = await cursor.to_list(length=1000)
    
    r_info = REGIONS.get(region, REGIONS["IN"])
    rate = r_info["rate"]
    symbol = r_info["symbol"]
    
    historical_lows = []
    deep_discounts = []
    best_resale = []
    price_risk = []
    
    for g in games:
        buy_p = g.get("current_price", 0.0) * rate
        low_p = g.get("lowest_ever_price", 0.0) * rate
        orig_p = g.get("original_price", 0.0) * rate
        disc = g.get("discount_percent", 0.0)
        
        stored_sell = g.get("sell_price")
        sell_p = (stored_sell if stored_sell is not None else g.get("current_price", 0.0) * 1.3) * rate
        profit = sell_p - buy_p
        margin = (profit / sell_p) * 100 if sell_p > 0 else 0
        
        game_info = {
            "cheapshark_id": g.get("cheapshark_id"),
            "name": g.get("name"),
            "thumbnail": g.get("thumbnail"),
            "buy_price": round(buy_p, 2),
            "original_price": round(orig_p, 2),
            "discount": disc,
            "lowest_ever": round(low_p, 2),
            "sell_price": round(sell_p, 2),
            "profit": round(profit, 2),
            "margin": round(margin, 2),
            "platform": g.get("platform"),
            "currency_symbol": symbol
        }
        
        if buy_p <= low_p * 1.03:
            historical_lows.append(game_info)
        if disc >= 75.0:
            deep_discounts.append(game_info)
        if disc >= 60.0 and margin >= 25.0:
            best_resale.append(game_info)
        if disc >= 50.0:
            price_risk.append(game_info)
            
    if not games:
        mock_games = [
            {
                "cheapshark_id": "mock_gta",
                "name": "Grand Theft Auto V",
                "thumbnail": "https://shared.fastly.steamstatic.com/store_images_shared/app/271590/header.jpg",
                "buy_price": round(749.0 * (rate / 83.0), 2),
                "original_price": round(1999.0 * (rate / 83.0), 2),
                "discount": 63.0,
                "lowest_ever": round(749.0 * (rate / 83.0), 2),
                "sell_price": round(999.0 * (rate / 83.0), 2),
                "profit": round(250.0 * (rate / 83.0), 2),
                "margin": 25.0,
                "platform": "Epic Games",
                "currency_symbol": symbol
            },
            {
                "cheapshark_id": "mock_rdr2",
                "name": "Red Dead Redemption 2",
                "thumbnail": "https://shared.fastly.steamstatic.com/store_images_shared/app/1174180/header.jpg",
                "buy_price": round(1200.0 * (rate / 83.0), 2),
                "original_price": round(3199.0 * (rate / 83.0), 2),
                "discount": 62.0,
                "lowest_ever": round(1050.0 * (rate / 83.0), 2),
                "sell_price": round(1680.0 * (rate / 83.0), 2),
                "profit": round(480.0 * (rate / 83.0), 2),
                "margin": 28.5,
                "platform": "Steam",
                "currency_symbol": symbol
            },
            {
                "cheapshark_id": "mock_witcher",
                "name": "The Witcher 3: Wild Hunt",
                "thumbnail": "https://shared.fastly.steamstatic.com/store_images_shared/app/292030/header.jpg",
                "buy_price": round(300.0 * (rate / 83.0), 2),
                "original_price": round(1499.0 * (rate / 83.0), 2),
                "discount": 80.0,
                "lowest_ever": round(299.0 * (rate / 83.0), 2),
                "sell_price": round(599.0 * (rate / 83.0), 2),
                "profit": round(299.0 * (rate / 83.0), 2),
                "margin": 50.0,
                "platform": "Steam",
                "currency_symbol": symbol
            },
            {
                "cheapshark_id": "mock_cyberpunk",
                "name": "Cyberpunk 2077",
                "thumbnail": "https://shared.fastly.steamstatic.com/store_images_shared/app/1091500/header.jpg",
                "buy_price": round(1499.0 * (rate / 83.0), 2),
                "original_price": round(2999.0 * (rate / 83.0), 2),
                "discount": 50.0,
                "lowest_ever": round(1499.0 * (rate / 83.0), 2),
                "sell_price": round(1999.0 * (rate / 83.0), 2),
                "profit": round(500.0 * (rate / 83.0), 2),
                "margin": 25.0,
                "platform": "Epic Games",
                "currency_symbol": symbol
            }
        ]
        for mg in mock_games:
            historical_lows.append(mg)
            if mg["discount"] >= 75.0:
                deep_discounts.append(mg)
            if mg["margin"] >= 25.0:
                best_resale.append(mg)
            if mg["discount"] >= 50.0:
                price_risk.append(mg)

    return {
        "historical_lows": historical_lows[:6],
        "deep_discounts": deep_discounts[:6],
        "best_resale": best_resale[:6],
        "price_risk": price_risk[:6]
    }

# --- SMART NOTIFICATIONS STREAM ---

@app.get("/api/notifications")
async def get_notifications(region: str = "IN"):
    """Fetch triggered alert events and historical low notifications"""
    notifications = []
    games_col = get_collection("games")
    alerts_col = get_collection("alerts")
    
    r_info = REGIONS.get(region, REGIONS["IN"])
    rate = r_info["rate"]
    symbol = r_info["symbol"]
    
    # 1. Historical lowest prices alerts
    cursor = games_col.find({}, {
        "current_price": 1, "lowest_ever_price": 1, "name": 1, "platform": 1
    })
    games = await cursor.to_list(length=1000)
    for g in games:
        buy = g.get("current_price", 0.0)
        low = g.get("lowest_ever_price", 0.0)
        if buy <= low * 1.01:
            notifications.append({
                "type": "HISTORICAL_LOW",
                "title": "Historical Low Reached",
                "message": f"'{g.get('name')}' is at its historical lowest price of {symbol}{round(buy * rate, 2)} on {g.get('platform')}!",
                "timestamp": datetime.utcnow() - timedelta(minutes=random.randint(10, 59))
            })
            
    # 2. Triggered price alert thresholds
    cursor = alerts_col.find({"is_active": False}, {
        "game_name": 1, "target_price": 1, "triggered_at": 1
    })
    triggered_alerts = await cursor.to_list(length=100)
    for ta in triggered_alerts:
        alert_target = ta.get("target_price", 0.0)
        notifications.append({
            "type": "TARGET_ALERT",
            "title": "Target Alert Triggered",
            "message": f"Target Hit! '{ta.get('game_name')}' fell below your target threshold of {symbol}{round(alert_target * rate, 2)}!",
            "timestamp": ta.get("triggered_at") or datetime.utcnow()
        })
        
    # 3. Upcoming sales event triggers
    now = datetime.utcnow()
    sale_calendar = [
        {"name": "Steam Autumn Sale", "date": datetime(2026, 11, 25, 18, 0, 0)},
        {"name": "Steam Winter Sale", "date": datetime(2026, 12, 22, 18, 0, 0)},
        {"name": "Epic Store Holiday Sale", "date": datetime(2026, 12, 17, 19, 0, 0)},
        {"name": "EA Publisher Showcase Sale", "date": datetime(2026, 9, 15, 17, 0, 0)},
        {"name": "Ubisoft Forward Summer Sale", "date": datetime(2026, 7, 18, 16, 0, 0)}
    ]
    for s in sale_calendar:
        delta = s["date"] - now
        if 0 < delta.days < 30:
            notifications.append({
                "type": "SALE_UPCOMING",
                "title": "Upcoming Sale Warning",
                "message": f"{s['name']} is starting in {delta.days} days! Prepare target buying funds.",
                "timestamp": datetime.utcnow()
            })
            
    return notifications[:10]

# --- ADMIN / PRICE SYNC / EXPORT ENDPOINTS ---

@app.post("/api/alerts")
async def create_alert(alert: AlertCreate):
    alerts_col = get_collection("alerts")
    region = alert.region or "IN"
    r_info = REGIONS.get(region, REGIONS["IN"])
    rate = r_info["rate"]
    symbol = r_info["symbol"]
    
    alert_doc = {
        "cheapshark_id": alert.cheapshark_id,
        "game_name": alert.game_name,
        "target_price": alert.target_price / rate,
        "region": region,
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    res = await alerts_col.insert_one(alert_doc)
    logs_col = get_collection("logs")
    await logs_col.insert_one({
        "event_type": "ALERT_CREATED",
        "game_name": alert.game_name,
        "message": f"Set price alert for '{alert.game_name}' at target {symbol}{alert.target_price}",
        "timestamp": datetime.utcnow()
    })
    return {"message": "Alert created successfully", "id": str(res.inserted_id)}

@app.get("/api/alerts")
async def get_alerts(region: str = "IN"):
    r_info = REGIONS.get(region, REGIONS["IN"])
    rate = r_info["rate"]
    symbol = r_info["symbol"]
    
    alerts_col = get_collection("alerts")
    cursor = alerts_col.find()
    alerts = await cursor.to_list(length=500)
    for a in alerts:
        a["id"] = str(a["_id"])
        del a["_id"]
        # Convert base USD price back to the requested region's rate
        a["target_price"] = round(a["target_price"] * rate, 2)
        a["symbol"] = symbol
        a["region"] = a.get("region", "IN")
    return alerts

@app.delete("/api/alerts/{alert_id}")
async def delete_alert(alert_id: str):
    alerts_col = get_collection("alerts")
    res = await alerts_col.delete_one({"_id": alert_id})
    if res.deleted_count == 0:
        try:
            fallback_res = await alerts_col.delete_one({"_id": {"$in": [ObjectId(alert_id), alert_id]}})
        except Exception:
            fallback_res = await alerts_col.delete_one({"_id": alert_id})
            
        if fallback_res.deleted_count > 0:
            return {"message": "Alert deleted successfully"}
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert deleted successfully"}

@app.put("/api/refresh")
async def force_refresh():
    try:
        await update_all_prices()
        return {"message": "All tracked game prices successfully updated!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh prices: {str(e)}")

@app.put("/api/refresh/{cheapshark_id}")
async def refresh_single_game(cheapshark_id: str):
    games_col = get_collection("games")
    game = await games_col.find_one({"cheapshark_id": cheapshark_id})
    
    # 1. Retrieve steam_app_id from DETAILS_CACHE if it exists to clear both caches
    steam_app_id = None
    from cheapshark import DETAILS_CACHE
    for k, entry in DETAILS_CACHE.items():
        if k.startswith(f"{cheapshark_id}_") and isinstance(entry, tuple) and len(entry) > 1:
            data = entry[1]
            if isinstance(data, dict) and "steam_app_id" in data:
                steam_app_id = data["steam_app_id"]
                break
                
    # 2. Invalidate cache
    invalidate_game_cache(cheapshark_id, steam_app_id)
    
    # 3. Get game details to retrieve the name (and steam_app_id if not found previously)
    try:
        details = await get_game_details_from_api(cheapshark_id, region="US")
        if not steam_app_id:
            steam_app_id = details.get("steam_app_id")
            if steam_app_id:
                invalidate_game_cache(cheapshark_id, steam_app_id)
                # Re-fetch with Steam cache cleared
                details = await get_game_details_from_api(cheapshark_id, region="US")
                
        if not game:
            game = {
                "cheapshark_id": cheapshark_id,
                "name": details["name"]
            }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Game details could not be retrieved from CheapShark: {str(e)}")
        
    try:
        await update_single_game_prices(game)
        
        updated_game = await games_col.find_one({"cheapshark_id": cheapshark_id})
        if updated_game:
            updated_game["id"] = str(updated_game["_id"])
            del updated_game["_id"]
            return updated_game
        else:
            return {"cheapshark_id": cheapshark_id, "name": game["name"], "status": "refreshed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh game: {str(e)}")

@app.get("/api/logs")
async def get_logs(limit: int = 50):
    logs_col = get_collection("logs")
    cursor = logs_col.find(sort=[("timestamp", -1)], limit=limit)
    logs = await cursor.to_list(length=limit)
    for l in logs:
        l["id"] = str(l["_id"])
        del l["_id"]
    return logs

@app.get("/api/stats")
async def get_dashboard_stats(region: str = "IN"):
    games_col = get_collection("games")
    alerts_col = get_collection("alerts")
    logs_col = get_collection("logs")
    
    total_games = await games_col.count_documents({})
    active_alerts = await alerts_col.count_documents({"is_active": True})
    
    cursor = games_col.find({}, {
        "discount_percent": 1, "current_price": 1, "original_price": 1,
        "cheapshark_id": 1, "name": 1, "thumbnail": 1, "platform": 1
    })
    games = await cursor.to_list(length=1000)
    
    r_info = REGIONS.get(region, REGIONS["IN"])
    rate = r_info["rate"]
    symbol = r_info["symbol"]
    
    deals_today = 0
    top_discounts = []
    
    biggest_disc_pct = 0.0
    biggest_disc_game = None
    
    for g in games:
        disc = g.get("discount_percent", 0.0)
        buy_p = g.get("current_price", 0.0) * rate
        orig_p = g.get("original_price", g.get("current_price", 0.0)) * rate
        
        if disc > 0:
            deals_today += 1
            top_discounts.append({
                "cheapshark_id": g.get("cheapshark_id"),
                "name": g.get("name"),
                "thumbnail": g.get("thumbnail"),
                "current_price": round(buy_p, 2),
                "original_price": round(orig_p, 2),
                "discount_percent": disc,
                "platform": g.get("platform", "Steam")
            })
            
        if disc > biggest_disc_pct:
            biggest_disc_pct = disc
            biggest_disc_game = {
                "name": g.get("name"),
                "discount_percent": disc,
                "thumbnail": g.get("thumbnail")
            }
            
    top_discounts.sort(key=lambda x: x["discount_percent"], reverse=True)
    top_discounts = top_discounts[:5]
    
    last_log = await logs_col.find_one({"event_type": {"$in": ["PRICE_UPDATED", "SYSTEM_START"]}}, sort=[("timestamp", -1)])
    last_update = last_log["timestamp"] if last_log else datetime.utcnow()
    
    return {
        "total_tracked": total_games,
        "lowest_prices_today": deals_today,
        "active_alerts": active_alerts,
        "last_update_time": last_update,
        "top_discounts": top_discounts,
        "biggest_discount_today": biggest_disc_game or {"name": "None", "discount_percent": 0.0, "thumbnail": ""},
        "currency_symbol": symbol
    }

@app.get("/api/countdown")
async def get_steam_sale_countdown():
    now = datetime.utcnow()
    next_sale_date = datetime(2026, 11, 25, 18, 0, 0)
    if now > next_sale_date:
        next_sale_date = datetime(2026, 12, 22, 18, 0, 0)
        
    delta = next_sale_date - now
    return {
        "sale_name": "Steam Autumn Sale" if next_sale_date.month == 11 else "Steam Winter Sale",
        "target_date": next_sale_date,
        "seconds_remaining": max(int(delta.total_seconds()), 0),
        "days_remaining": max(delta.days, 0)
    }

@app.get("/api/trending")
async def get_trending_games():
    trending_col = get_collection("trending")
    cursor = trending_col.find(sort=[("search_count", -1)], limit=5)
    games = await cursor.to_list(length=5)
    for g in games:
        g["id"] = str(g["_id"])
        del g["_id"]
    return games

@app.post("/api/search-history")
async def save_search(query: str = Query(...)):
    history_col = get_collection("search_history")
    await history_col.delete_many({"query": query})
    await history_col.insert_one({
        "query": query,
        "timestamp": datetime.utcnow()
    })
    return {"status": "saved"}

@app.get("/api/search-history")
async def get_search_history():
    history_col = get_collection("search_history")
    cursor = history_col.find(sort=[("timestamp", -1)], limit=10)
    history = await cursor.to_list(length=10)
    return [item["query"] for item in history]

@app.get("/api/export/{game_id}")
async def export_price_history_csv(game_id: str, region: str = "IN"):
    history_col = get_collection("price_history")
    games_col = get_collection("games")
    
    game = await games_col.find_one({"cheapshark_id": game_id})
    game_name = game["name"] if game else "game"
    
    r_info = REGIONS.get(region, REGIONS["IN"])
    rate = r_info["rate"]
    code = r_info["code"]
    
    cursor = history_col.find({"cheapshark_id": game_id}, sort=[("timestamp", 1)])
    history = await cursor.to_list(length=1000)
    
    if not history:
        raise HTTPException(status_code=404, detail="No price history found to export")
        
    import io
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["Game Name", "CheapShark ID", f"Price ({code})", "Timestamp (UTC)"])
    for entry in history:
        writer.writerow([entry["game_name"], entry["cheapshark_id"], round(entry["price"] * rate, 2), entry["timestamp"].isoformat()])
        
    csv_data = output.getvalue()
    headers = {
        'Content-Disposition': f'attachment; filename="{game_name.replace(" ", "_")}_price_history_{code}.csv"',
        'Content-Type': 'text/csv',
    }
    return Response(content=csv_data, headers=headers)

@app.get("/api/export/wishlist")
async def export_wishlist_csv(region: str = "IN"):
    games_col = get_collection("games")
    cursor = games_col.find({}, {
        "name": 1, "cheapshark_id": 1, "current_price": 1, "sell_price": 1,
        "platform": 1, "discount_percent": 1, "last_checked": 1
    })
    games = await cursor.to_list(length=1000)
    
    r_info = REGIONS.get(region, REGIONS["IN"])
    rate = r_info["rate"]
    code = r_info["code"]
    
    import io
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "Game Name", 
        "CheapShark ID", 
        f"Buy Price ({code})", 
        f"Sell Price ({code})", 
        f"Profit ({code})", 
        "Margin (%)", 
        "Platform", 
        "Discount (%)", 
        "Last Checked"
    ])
    
    for g in games:
        buy_p = g.get("current_price", 0.0) * rate
        stored_sell_price = g.get("sell_price")
        if stored_sell_price is None:
            stored_sell_price = g.get("current_price", 0.0) * 1.3
        sell_p = stored_sell_price * rate
        
        profit = sell_p - buy_p
        margin = (profit / sell_p) * 100 if sell_p > 0 else 0
        
        writer.writerow([
            g.get("name"),
            g.get("cheapshark_id"),
            round(buy_p, 2),
            round(sell_p, 2),
            round(profit, 2),
            f"{round(margin, 2)}%",
            g.get("platform", "Steam"),
            g.get("discount_percent", 0.0),
            g.get("last_checked").isoformat() if isinstance(g.get("last_checked"), datetime) else str(g.get("last_checked"))
        ])
        
    csv_data = output.getvalue()
    headers = {
        'Content-Disposition': f'attachment; filename="rakexura_wishlist_inventory_{code}.csv"',
        'Content-Type': 'text/csv',
    }
    return Response(content=csv_data, headers=headers)

# --- SERVE FRONTEND STATIC FILES ---
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))

if os.path.exists(frontend_dist_path):
    # Mount assets folder if it exists
    assets_path = os.path.join(frontend_dist_path, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")
        
    @app.get("/{catchall:path}")
    async def serve_frontend(catchall: str):
        if catchall.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
            
        file_path = os.path.join(frontend_dist_path, catchall)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
            
        index_path = os.path.join(frontend_dist_path, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
            
        raise HTTPException(status_code=404, detail="Not Found")

