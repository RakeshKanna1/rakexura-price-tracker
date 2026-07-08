import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB Configuration
MONGODB_URI = os.getenv("MONGODB_URI", "")
DB_NAME = os.getenv("DB_NAME", "rakexura_tracker")

# CheapShark API Configuration
CHEAPSHARK_API_URL = "https://www.cheapshark.com/api/1.0"

# Application Settings
PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "0.0.0.0")
ENV = os.getenv("ENV", "development")

# Default stores mapping from CheapShark (ID to Store Name, Active status, and Store Type)
STORE_MAPPING = {
    "1": {"name": "Steam", "icon": "Steam", "url": "https://store.steampowered.com", "type": "Official Store"},
    "2": {"name": "GamersGate", "icon": "GamersGate", "url": "https://www.gamersgate.com", "type": "Authorized Reseller"},
    "3": {"name": "Green Man Gaming", "icon": "GMG", "url": "https://www.greenmangaming.com", "type": "Authorized Reseller"},
    "7": {"name": "GOG.com", "icon": "GOG", "url": "https://www.gog.com", "type": "Official Store"},
    "11": {"name": "Humble Store", "icon": "Humble", "url": "https://www.humblebundle.com/store", "type": "Authorized Reseller"},
    "13": {"name": "Ubisoft Store", "icon": "Ubisoft", "url": "https://store.ubisoft.com", "type": "Official Store"},
    "15": {"name": "Fanatical", "icon": "Fanatical", "url": "https://www.fanatical.com", "type": "Authorized Reseller"},
    "21": {"name": "WinGameStore", "icon": "WinGameStore", "url": "https://www.wingamestore.com", "type": "Authorized Reseller"},
    "23": {"name": "GameBillet", "icon": "GameBillet", "url": "https://www.gamebillet.com", "type": "Authorized Reseller"},
    "25": {"name": "Epic Games Store", "icon": "Epic", "url": "https://store.epicgames.com", "type": "Official Store"},
    "27": {"name": "Gamesplanet", "icon": "Gamesplanet", "url": "https://www.gamesplanet.com", "type": "Authorized Reseller"},
    "30": {"name": "IndieGala", "icon": "IndieGala", "url": "https://www.indiegala.com", "type": "Authorized Reseller"},
    "35": {"name": "DreamGame", "icon": "DreamGame", "url": "https://www.dreamgame.com", "type": "Authorized Reseller"}
}

# Multi-Region configuration
REGIONS = {
    "IN": {"cc": "IN", "rate": 83.0, "symbol": "₹", "code": "INR", "name": "India (INR)"},
    "US": {"cc": "US", "rate": 1.0, "symbol": "$", "code": "USD", "name": "United States (USD)"},
    "TR": {"cc": "TR", "rate": 32.5, "symbol": "₺", "code": "TRY", "name": "Turkey (TRY)"},
    "AR": {"cc": "AR", "rate": 910.0, "symbol": "$", "code": "ARS", "name": "Argentina (ARS)"},
    "BR": {"cc": "BR", "rate": 5.5, "symbol": "R$", "code": "BRL", "name": "Brazil (BRL)"},
    "EU": {"cc": "DE", "rate": 0.92, "symbol": "€", "code": "EUR", "name": "Europe (EUR)"}
}
