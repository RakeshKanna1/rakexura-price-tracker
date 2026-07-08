# 📈 Rakexura Price Tracker & Arbitrage Manager (`rakexura-price-tracker`)
### 🚀 Business Intelligence Suite & Sales Ledger for Digital Game Resellers

[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Recharts](https://img.shields.io/badge/Recharts-Visualizations-FF6B6B?style=for-the-badge&logo=chart&logoColor=white)](https://recharts.org/)

**Rakexura Price Tracker** is a complete, production-grade business intelligence dashboard designed for digital game key reselling. It enables operators to monitor price margins across digital storefronts, verify global price indexes, track purchasing/sales ledger histories, monitor digital key inventory limits, and generate automated purchase recommendations based on market price drop velocities and expected margins.

---

## ✨ Features & Architecture

### 📊 Business Intelligence & AI Suggestions
* **Automated ROI Scoring:** The intelligence engine evaluates wishlist entries against current market values to calculate net margins, markup ROI, and price velocity trends.
* **Smart Decision Output:** Analyzes market trends and provides actionable recommendation tags such as `"Buy Now: High Spread"`, `"Hold: Rapid Price drop velocity"`, or `"Avoid: Insufficient margins"`.
* **Visual Recharts Analytics:** Visualizes historical pricing trends, sales distribution timelines, profit metrics, and inventory value ratios.

### 💰 Financial Ledger & Inventory Manager
* **Sales Tracking ledger:** Log transactional details (cost of goods sold, sell price, key quantity, target region, and sales channel).
* **Automated Financial Stats:** Calculates gross profit, net ROI, and margin percentage averages to provide real-time updates of business performance.
* **Key Inventory Monitoring:** Track active stock quantities, serial keys, and supplier sources with automated warnings for low-level reserves.
* **Data Exporter:** Export complete inventory logs or single-game historical tracking data directly as CSV sheets.

### 🔄 Multi-store Scraper Engine
* **CheapShark Integration:** Scrapes live game offers, discounts, and store allocations across multiple digital storefronts (Steam, GOG, Epic, Fanatical, Humble, etc.).
* **Active Chrono Scheduler:** Background service running `APScheduler` updates catalog indexes, maintains historical price curves, and tracks trending game lookup counters.
* **Intelligent Caching:** Local cache configurations for game detail requests to minimize API calls and maintain performance.
* **Flexible Storage Fallback:** Works out-of-the-box using local JSON file databases (stored in `backend/db_files/`) if no MongoDB cluster connection string is supplied.

---

## 📂 Monorepo Directory Structure

```
rakexura-price-tracker/
├── backend/                  # FastAPI Python backend application
│   ├── cheapshark.py         # CheapShark API requests & caching utility
│   ├── database.py           # MongoDB connection client & JSON fallback engine
│   ├── scheduler.py          # Background APScheduler routines for price scrapes
│   ├── models.py             # Pydantic schemas for ledgers and alerts
│   ├── main.py               # Core application entrypoint and API routers
│   └── requirements.txt      # Python dependencies
└── frontend/                 # React Vite frontend dashboard
    ├── src/                  # React source components and state
    ├── package.json          # Frontend packages & build script configurations
    └── vite.config.js        # Vite bundler and Tailwind CSS plugins
```

---

## 🚀 Setup & Local Development

### 1. Backend Setup (FastAPI)
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment:
   Copy `.env.example` to `.env` and set your credentials:
   ```bash
   cp .env.example .env
   ```
   *Note: If `MONGODB_URI` is left blank, the backend automatically sets up local JSON file storage inside `backend/db_files/`.*
5. Run the FastAPI development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### 2. Frontend Setup (React & Vite)
1. Navigate to the `frontend/` directory:
   ```bash
   cd ../frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Launch the hot-reload Vite server:
   ```bash
   npm run dev
   ```
4. Access the client panel at [http://localhost:5173](http://localhost:5173).

---

## 🔒 Security & Git Safeguards

The monorepo includes a root [.gitignore](.gitignore) configuration that blocks the tracking of sensitive configurations:
* Enforces exclusion of local environment variable files (`backend/.env`).
* Prevents staging of python cache directories (`__pycache__/`) and local JSON databases (`backend/db_files/`).
* Excludes frontend compiler assets (`frontend/dist/` and `frontend/node_modules/`).
