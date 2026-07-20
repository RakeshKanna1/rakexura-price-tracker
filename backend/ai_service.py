import httpx
import logging
from config import GEMINI_API_KEY

logger = logging.getLogger("rakexura-backend")

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent"

async def call_gemini(prompt: str) -> str:
    """Helper function to call Gemini API via HTTP POST"""
    if not GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY is empty in env config.")
        return "ERROR: GEMINI_API_KEY environment variable is not configured."
        
    try:
        url = f"{GEMINI_API_URL}?key={GEMINI_API_KEY}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": 0.2,
                "topP": 0.8,
                "maxOutputTokens": 1000
            }
        }
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code == 200:
                res_data = response.json()
                candidates = res_data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "")
            else:
                err_msg = f"Gemini API returned status code {response.status_code}: {response.text}"
                logger.error(err_msg)
                return f"ERROR: {err_msg}"
    except Exception as e:
        err_msg = f"Failed to communicate with Gemini API: {str(e)}"
        logger.error(err_msg)
        return f"ERROR: {err_msg}"
        
    return "ERROR: Unknown response error from Gemini API."

async def get_game_ai_analysis(game_name: str, current_price: float, original_price: float, discount: float, hist_lowest: float, hist_highest: float, hist_avg: float, currency_symbol: str) -> str:
    """Analyze a single game's resale/arbitrage viability using Gemini"""
    prompt = f"""
    You are the Rakexura BI AI advisor, an expert in digital game key reselling and retail arbitrage.
    Analyze the following market details for the game '{game_name}':
    - Current Purchase Price (Bargain Deal): {currency_symbol}{current_price}
    - Standard Retail Price: {currency_symbol}{original_price}
    - Discount Depth: {discount}% off
    - Historical Lowest Price: {currency_symbol}{hist_lowest}
    - Historical Highest Price: {currency_symbol}{hist_highest}
    - Historical Average Price: {currency_symbol}{hist_avg}

    Provide an extremely short and concise analysis (maximum 2 sentences) for a digital game key reseller. Detail:
    1. Buy/Wait recommendation.
    2. Estimated resell markup & profit margin.
    Do not use markdown headers, just return a clean, direct sentence or two.
    """
    
    ai_response = await call_gemini(prompt)
    if ai_response and not ai_response.startswith("ERROR:"):
        return ai_response.strip()
        
    # Rule-based fallback
    margin_est = 30.0
    resell_target = current_price * 1.3
    
    if current_price <= hist_lowest * 1.05:
        recommendation = f"Highly Recommended: BUY NOW. Game is at its historical bottom ({currency_symbol}{current_price})."
        risk = "Low risk - historic price drops indicate keys rarely go lower."
    elif discount >= 70.0:
        recommendation = f"Recommended: BUY. The discount of {discount}% is deep."
        risk = "Moderate risk - watch for store region restrictions on keys."
    else:
        recommendation = f"Hold / WAIT: Price ({currency_symbol}{current_price}) is above historic sweet spots."
        risk = "High margin compression risk. Wait for the upcoming sales countdowns."
        resell_target = current_price * 1.15
        margin_est = 15.0
        
    err_note = f"\n\n*(AI failed fallback: {ai_response})*" if ai_response.startswith("ERROR:") else ""
    return (
        f"[RAKEXURA Local BI Engine] {recommendation} "
        f"A viable resell price target is {currency_symbol}{round(resell_target, 2)} yielding a projected {margin_est}% profit margin. "
        f"Arbitrage Risk Assessment: {risk}{err_note}"
    )

async def get_portfolio_insights(wishlist_summary: list, sales_summary: list, inventory_summary: list, currency_symbol: str) -> str:
    """Generate overall business intelligence reports on inventory and sales ledger"""
    
    wishlist_text = "\n".join([
        f"- {g['name']}: Buy price {currency_symbol}{g['current_price']}, Stored Sell target {currency_symbol}{g['sell_price']}, Discount {g['discount_percent']}%"
        for g in wishlist_summary[:10]
    ]) if wishlist_summary else "No games currently tracked on wishlist."
    
    sales_text = "\n".join([
        f"- Sold '{s['game_name']}' for {currency_symbol}{s['sell_price']} (Cost: {currency_symbol}{s['purchase_cost']}, Profit: {currency_symbol}{s['profit']})"
        for s in sales_summary[:10]
    ]) if sales_summary else "No sales recorded yet."
    
    inventory_text = "\n".join([
        f"- {i['game_name']}: Qty {i['quantity']} purchased at {currency_symbol}{i['purchase_price']} via {i['purchase_platform']}"
        for i in inventory_summary[:10]
    ]) if inventory_summary else "No active inventory keys logged."

    prompt = f"""
    You are the Rakexura Business Intelligence AI strategist. Analyze this ledger portfolio:
    
    [WISHLIST / TRACKED DEALS]
    {wishlist_text}
    
    [LOGGED SALES LEDGER HISTORY]
    {sales_text}
    
    [ACTIVE PURCHASE STOCK / INVENTORY]
    {inventory_text}
    
    Please provide a very short, high-impact business analysis report (using brief markdown bullet points). Limit to 3 sections:
    1. **Arbitrage Performance**: Overall profit trend summary.
    2. **Top Buys**: Highlight 1 game to prioritize buying.
    3. **Risk**: Core tip for inventory.
    
    Keep the report under 80 words total.
    """
    
    ai_response = await call_gemini(prompt)
    if ai_response and not ai_response.startswith("ERROR:"):
        return ai_response.strip()
        
    # Local fallback
    total_sales_count = len(sales_summary)
    total_profit = sum(s['profit'] for s in sales_summary)
    wishlist_deals = [g for g in wishlist_summary if g['discount_percent'] >= 60]
    
    err_note = f"\n\n> [!WARNING]\n> **Gemini AI service error**: {ai_response}\n> *Local rule-based fallback active.*" if ai_response.startswith("ERROR:") else ""
    
    fallback_report = f"""### **[RAKEXURA Local BI Report]**

* **Arbitrage Performance Review**:
  Logged transactions: **{total_sales_count} sales**. Total net profit generated: **{currency_symbol}{round(total_profit, 2)}**. ROI performance is heavily reliant on key inventory turnover speed. Keep logging transactions to refine margin curves.

* **Immediate buying opportunities**:
  Found **{len(wishlist_deals)} high-yield games** in your monitored list with discounts exceeding 60%. Prioritize keys targeting platforms with regional markup variance (e.g. Steam vs Epic).

* **Inventory & Risk Management**:
  Maintain a reserve buffer of 20% capital for upcoming seasonal store sales. Monitor key validation expiration dates on third-party keys to prevent dead stock losses.{err_note}
"""
    return fallback_report

async def answer_chat_query(user_query: str, wishlist_summary: list, sales_summary: list, inventory_summary: list, currency_symbol: str) -> str:
    """Answer a user query with full portfolio context"""
    wishlist_text = "\n".join([
        f"- {g['name']}: Buy {currency_symbol}{g['current_price']}, Target Resell {currency_symbol}{g['sell_price']}, Discount {g['discount_percent']}%"
        for g in wishlist_summary[:8]
    ]) if wishlist_summary else "None"
    
    sales_text = "\n".join([
        f"- {s['game_name']}: Sold for {currency_symbol}{s['sell_price']}, Cost {currency_symbol}{s['purchase_cost']}, Profit {currency_symbol}{s['profit']}"
        for s in sales_summary[:8]
    ]) if sales_summary else "None"
    
    inventory_text = "\n".join([
        f"- {i['game_name']}: Qty {i['quantity']}, Cost {currency_symbol}{i['purchase_price']}"
        for i in inventory_summary[:8]
    ]) if inventory_summary else "None"

    prompt = f"""
    You are the Rakexura AI Assistant, a specialized business consultant for digital game reselling and arbitrage.
    
    Here is the reseller's current system state:
    - Base Currency: {currency_symbol}
    - Wishlist Deals:
    {wishlist_text}
    - Sales Ledger:
    {sales_text}
    - Inventory Stock:
    {inventory_text}
    
    User Question: "{user_query}"
    
    Provide a highly direct, friendly, and extremely short answer (maximum 2 sentences). Get straight to the point.
    """
    
    ai_response = await call_gemini(prompt)
    if ai_response and not ai_response.startswith("ERROR:"):
        return ai_response.strip()
        
    err_note = f"\n\n(Debugging Info: {ai_response})" if ai_response.startswith("ERROR:") else ""
    return f"[RAKEXURA Local BI Assistant] (Configure GEMINI_API_KEY for dynamic answers). Based on local records, you have {len(wishlist_summary)} games tracked, {len(inventory_summary)} items in stock, and {len(sales_summary)} completed sales. Let me know how I can assist you with your margins!{err_note}"
