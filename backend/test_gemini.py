import asyncio
import httpx
import sys

# Add backend directory to path to load config
sys.path.append('.')
from config import GEMINI_API_KEY

async def test():
    print(f"Testing GEMINI_API_KEY: {GEMINI_API_KEY[:8]}...")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": "Hello, respond with 'Success' if you can read this."}]}]
    }
    headers = {"Content-Type": "application/json"}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            print(f"Status Code: {response.status_code}")
            if response.status_code == 200:
                print(f"Response: {response.json()}")
            else:
                print(f"Error Response: {response.text}")
    except Exception as e:
        print(f"Connection Exception: {str(e)}")

asyncio.run(test())
