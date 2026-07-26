import httpx
import logging
import urllib.parse
import time
import copy
from typing import List, Dict, Any
from config import CHEAPSHARK_API_URL, STORE_MAPPING, REGIONS

logger = logging.getLogger("rakexura-backend")

# Global HTTP client reuse connection pool for speed (skips TCP handshake / SSL negotiation on every request)
HTTP_CLIENT = httpx.AsyncClient(
    headers={"User-Agent": "RakexuraArbitrageBIEngine/1.0 (contact@rakexura-gaming.com)"},
    timeout=10.0,
    limits=httpx.Limits(max_keepalive_connections=20, max_connections=30)
)

# In-memory cache structures: { key: (expiry_timestamp, data) }
SEARCH_CACHE = {}
STEAM_PRICE_CACHE = {}
DETAILS_CACHE = {}
RAW_GAME_CACHE = {}          # Raw CheapShark response cache to share across regional details requests

SEARCH_CACHE_TTL = 300       # 5 minutes
STEAM_PRICE_CACHE_TTL = 900  # 15 minutes
DETAILS_CACHE_TTL = 600      # 10 minutes
RAW_GAME_CACHE_TTL = 600     # 10 minutes

async def search_games_from_api(title: str) -> List[Dict[str, Any]]:
    """
    Search games by title using CheapShark API (cached for 5 minutes)
    """
    title_clean = title.strip().lower()
    now = time.time()
    
    # Check cache
    if title_clean in SEARCH_CACHE:
        expiry, data = SEARCH_CACHE[title_clean]
        if now < expiry:
            logger.info(f"Search cache HIT for query: '{title_clean}'")
            return copy.deepcopy(data)
            
    # Cache miss
    try:
        response = await HTTP_CLIENT.get(
            f"{CHEAPSHARK_API_URL}/games", 
            params={"title": title}
        )
        response.raise_for_status()
        results = response.json()
        
        formatted_games = []
        for item in results[:10]:
            formatted_games.append({
                "cheapshark_id": str(item["gameID"]),
                "name": item["external"],
                "thumbnail": item["thumb"],
                "cheapest_price": float(item["cheapest"]) if item.get("cheapest") else None,
                "cheapest_deal_id": item.get("cheapestDealID")
            })
        
        # Save to cache if successful
        if formatted_games:
            SEARCH_CACHE[title_clean] = (now + SEARCH_CACHE_TTL, formatted_games)
        return formatted_games
    except Exception as e:
        logger.error(f"Error searching games from CheapShark: {e}")
        return []

async def get_steam_price_local(steam_app_id: str, cc: str = "IN") -> dict:
    """
    Fetch accurate pricing from Steam storefront API in local currency of targeted region (cached for 15 minutes)
    """
    cache_key = f"{steam_app_id}_{cc}"
    now = time.time()
    
    # Check cache
    if cache_key in STEAM_PRICE_CACHE:
        expiry, data = STEAM_PRICE_CACHE[cache_key]
        if now < expiry:
            logger.debug(f"Steam price cache HIT for app {steam_app_id} (cc={cc})")
            return copy.deepcopy(data)
            
    # Cache miss
    try:
        response = await HTTP_CLIENT.get(
            "https://store.steampowered.com/api/appdetails",
            params={"appids": steam_app_id, "cc": cc, "filters": "price_overview"}
        )
        response.raise_for_status()
        data = response.json()
        
        if data and data.get(steam_app_id, {}).get("success"):
            price_data = data[steam_app_id]["data"].get("price_overview")
            if price_data:
                # Prices are returned in cents/paise (e.g. 299900 = 2999.00)
                original = float(price_data["initial"]) / 100.0
                current = float(price_data["final"]) / 100.0
                discount = float(price_data["discount_percent"])
                
                result = {
                    "original": original,
                    "current": current,
                    "discount": discount
                }
                # Save to cache
                STEAM_PRICE_CACHE[cache_key] = (now + STEAM_PRICE_CACHE_TTL, result)
                return result
    except Exception as e:
        logger.error(f"Failed to fetch Steam local price (cc={cc}) for app {steam_app_id}: {e}")
    return None

def get_direct_store_link(platform_name: str, game_name: str, steam_app_id: str = None) -> str:
    encoded_name = urllib.parse.quote_plus(game_name)
    if platform_name == "Steam" and steam_app_id:
        return f"https://store.steampowered.com/app/{steam_app_id}"
    elif platform_name == "Steam":
        return f"https://store.steampowered.com/search/?term={encoded_name}"
    elif platform_name == "Epic Games Store":
        return f"https://store.epicgames.com/en-US/browse?q={encoded_name}"
    elif platform_name == "EA App":
        return f"https://www.ea.com/games/library/pc-download?search={encoded_name}"
    elif platform_name == "Ubisoft Store":
        return f"https://store.ubisoft.com/search?q={encoded_name}"
    elif platform_name == "Xbox PC":
        return f"https://www.xbox.com/en-IN/games/all-games?Platform=PC&search={encoded_name}"
    elif platform_name == "Green Man Gaming":
        return f"https://www.greenmangaming.com/search?query={encoded_name}"
    elif platform_name == "Fanatical":
        return f"https://www.fanatical.com/search?search={encoded_name}"
    elif platform_name == "Humble Store":
        return f"https://www.humblebundle.com/store/search?search={encoded_name}"
    return "#"

async def get_game_details_from_api(game_id: str, region: str = "IN", bypass_cache: bool = False) -> Dict[str, Any]:
    """
    Get detailed game information and pricing across stores, converted to regional currency (cached for 10 minutes)
    """
    cache_key = f"{game_id}_{region}"
    now = time.time()
    
    # 1. Check regional details cache
    if not bypass_cache and cache_key in DETAILS_CACHE:
        expiry, data = DETAILS_CACHE[cache_key]
        if now < expiry:
            logger.info(f"Details cache HIT for ID {game_id} (region={region})")
            return copy.deepcopy(data)
            
    # 2. Get raw CheapShark data (cache or API)
    raw_data = None
    if not bypass_cache and game_id in RAW_GAME_CACHE:
        raw_expiry, raw_res = RAW_GAME_CACHE[game_id]
        if now < raw_expiry:
            raw_data = raw_res
            
    if not raw_data:
        try:
            response = await HTTP_CLIENT.get(
                f"{CHEAPSHARK_API_URL}/games",
                params={"id": game_id}
            )
            response.raise_for_status()
            raw_data = response.json()
            # Cache the raw API response to share across all regional views
            RAW_GAME_CACHE[game_id] = (now + RAW_GAME_CACHE_TTL, raw_data)
        except Exception as e:
            logger.error(f"Error fetching game details for ID {game_id} from CheapShark: {e}")
            raise e
            
    info = raw_data.get("info", {})
    deals = raw_data.get("deals", [])
    cheapest_ever = raw_data.get("cheapestPriceEver", {})
    
    # Get region details
    r_info = REGIONS.get(region, REGIONS["IN"])
    cc = r_info["cc"]
    rate = r_info["rate"]
    symbol = r_info["symbol"]
    code = r_info["code"]
    
    # Fetch accurate local Steam pricing for selected region
    steam_app_id = info.get("steamAppID")
    steam_local = None
    if steam_app_id:
        if bypass_cache:
            steam_cache_key = f"{steam_app_id}_{cc}"
            STEAM_PRICE_CACHE.pop(steam_cache_key, None)
        steam_local = await get_steam_price_local(steam_app_id, cc)
    
    platform_prices = []
    found_store_ids = set()
    
    # Real stores from CheapShark
    for deal in deals:
        store_id = str(deal["storeID"])
        if store_id in STORE_MAPPING:
            store_info = STORE_MAPPING[store_id]
            price_usd = float(deal["price"])
            retail_usd = float(deal["retailPrice"])
            deal_id = deal.get("dealID")
            if deal_id:
                direct_link = f"https://www.cheapshark.com/redirect?dealID={deal_id}"
            else:
                direct_link = get_direct_store_link(store_info["name"], info.get("title"), steam_app_id)
            
            # Apply currency conversion rates
            current_price = price_usd * rate
            original_price = retail_usd * rate
            discount_percent = savings
            
            # Overwrite Steam price if we got accurate details directly from Steam Storefront API
            if store_id == "1" and steam_local:
                current_price = steam_local["current"]
                original_price = steam_local["original"]
                discount_percent = steam_local["discount"]
            
            platform_prices.append({
                "store_id": store_id,
                "platform": store_info["name"],
                "icon": store_info["icon"],
                "type": store_info["type"],
                "current_price": round(current_price, 2),
                "original_price": round(original_price, 2),
                "discount_percent": round(discount_percent, 2),
                "store_link": direct_link,
                "is_available": True
            })
            found_store_ids.add(store_id)
    
    # Sort platform prices so lowest is first
    platform_prices.sort(key=lambda x: x["current_price"])
    
    # Find the lowest price
    lowest_price = platform_prices[0]["current_price"] if platform_prices else 0.0
    
    # Convert cheapest ever to regional currency
    cheapest_ever_val = float(cheapest_ever.get("price", 0.0))
    if cheapest_ever_val > 0.0:
        cheapest_ever_converted = cheapest_ever_val * rate
    else:
        cheapest_ever_converted = lowest_price
        
    result = {
        "cheapshark_id": game_id,
        "steam_app_id": steam_app_id,
        "name": info.get("title", "Unknown Game"),
        "thumbnail": info.get("thumb", ""),
        "banner": info.get("thumb", ""),
        "description": f"Compare regional prices across major PC stores for {info.get('title')}. Get instant metrics for margins planning and customer order fulfillment.",
        "lowest_price": round(lowest_price, 2),
        "cheapest_ever": round(cheapest_ever_converted, 2),
        "platform_prices": platform_prices,
        "currency_symbol": symbol,
        "currency_code": code,
        "region": region
    }
    
    # Save to cache
    if result:
        DETAILS_CACHE[cache_key] = (now + DETAILS_CACHE_TTL, result)
    return result

def invalidate_game_cache(cheapshark_id: str, steam_app_id: str = None):
    """
    Invalidate cache entries for the given game ID and optional Steam app ID
    """
    # Remove from DETAILS_CACHE for all regions
    keys_to_remove = [k for k in DETAILS_CACHE if k.startswith(f"{cheapshark_id}_")]
    for k in keys_to_remove:
        DETAILS_CACHE.pop(k, None)
        
    # Remove from RAW_GAME_CACHE
    RAW_GAME_CACHE.pop(cheapshark_id, None)
        
    # Remove from STEAM_PRICE_CACHE for all regions
    if steam_app_id:
        keys_to_remove_steam = [k for k in STEAM_PRICE_CACHE if k.startswith(f"{steam_app_id}_")]
        for k in keys_to_remove_steam:
            STEAM_PRICE_CACHE.pop(k, None)


# In-memory deals cache
DEALS_CACHE = {}
DEALS_CACHE_TTL = 600  # 10 minutes

async def get_deals_from_api(
    store_id: str = None, 
    upper_price: float = None, 
    lower_price: float = None,
    min_discount: int = None,
    sort_by: str = "Deal Rating", 
    page_size: int = 30
) -> List[Dict[str, Any]]:
    """
    Fetch active game deals on sale from CheapShark Deals API
    """
    now = time.time()
    cache_key = f"{store_id}_{upper_price}_{lower_price}_{min_discount}_{sort_by}_{page_size}"
    
    if cache_key in DEALS_CACHE:
        expiry, data = DEALS_CACHE[cache_key]
        if now < expiry:
            return copy.deepcopy(data)
            
    params = {
        "onSale": "1",
        "pageSize": str(page_size),
        "sortBy": sort_by,
        "desc": "1"
    }
    if store_id:
        params["storeID"] = str(store_id)
    if upper_price is not None:
        params["upperPrice"] = str(upper_price)
    if lower_price is not None:
        params["lowerPrice"] = str(lower_price)
        
    try:
        response = await HTTP_CLIENT.get(
            f"{CHEAPSHARK_API_URL}/deals",
            params=params
        )
        response.raise_for_status()
        deals_raw = response.json()
        
        formatted_deals = []
        for deal in deals_raw:
            savings = float(deal.get("savings", 0.0))
            if min_discount is not None and savings < min_discount:
                continue
            
            store_id_val = str(deal.get("storeID"))
            store_info = STORE_MAPPING.get(store_id_val, {"name": "PC Store"})
            
            sale_price = float(deal.get("salePrice", 0.0))
            normal_price = float(deal.get("normalPrice", sale_price))
            if normal_price < sale_price:
                normal_price = sale_price * 1.4
                
            formatted_deals.append({
                "cheapshark_id": str(deal.get("gameID")),
                "deal_id": deal.get("dealID"),
                "name": deal.get("title"),
                "thumbnail": deal.get("thumb"),
                "sale_price_usd": sale_price,
                "normal_price_usd": normal_price,
                "discount_percent": round(savings, 1),
                "platform": store_info.get("name", "Steam"),
                "metacritic_score": deal.get("metacriticScore"),
                "deal_rating": deal.get("dealRating")
            })
            
        DEALS_CACHE[cache_key] = (now + DEALS_CACHE_TTL, formatted_deals)
        return formatted_deals
    except Exception as e:
        logger.error(f"Error fetching deals from CheapShark: {e}")
        return []

