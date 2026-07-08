# Rakexura Price Tracker - Desktop Application

You can now run your project as a **fully standalone desktop application** instead of a script that launches a web browser tab!

## 🚀 How to Run the App
Simply go to the `dist/` directory and run:
* **`dist/RakexuraPriceTracker.exe`**

Double-click this file to launch the application. It will:
1. Start the FastAPI backend server in the background automatically.
2. Load the Vite React frontend in a beautiful, native desktop window (using your system's Edge WebView2 engine).
3. Shut down the backend server completely when you close the window (leaving no background processes running!).

---

## 💾 Your Database & Persistence
* When running as an `.exe`, the application stores your local JSON database files (`games.json`, `price_history.json`, etc.) in a folder named **`db_files/`** located **next to the executable** (i.e. `dist/db_files/`).
* On the first run, the app automatically copies your existing database files from `backend/db_files/` so you **do not lose any of your existing wishlist or price tracker history**!

---

## 🛠️ How to Rebuild the App (If you edit code)
If you make changes to the React frontend or FastAPI backend code in the future, you can easily rebuild the standalone executable:
1. Double-click the **`build_app.bat`** file in the root directory.
2. This script will automatically:
   * Build the React frontend production files into `frontend/dist/`.
   * Bundle everything (frontend assets + backend python scripts + desktop shell) into a single executable using PyInstaller.
3. The new executable will be generated at `dist/RakexuraPriceTracker.exe`.
