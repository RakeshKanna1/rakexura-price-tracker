@echo off
echo ===================================================
echo   RAKEXURA PRICE TRACKER BUILDER (STANDALONE APP)
echo ===================================================
echo.

echo [1/3] Building React Frontend (production)...
cd frontend
call npm install
call npm run build
cd ..

echo.
echo [2/3] Cleaning up old build artifacts...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist

echo.
echo [3/3] Compiling app with PyInstaller...
pyinstaller --onefile --noconsole --name="RakexuraPriceTracker" --icon=rakexura_logo.ico --paths backend --add-data "backend;backend" --add-data "frontend/dist;frontend/dist" app_gui.py

echo.
echo ===================================================
echo  Build complete! Standalone executable is in:
echo  dist/RakexuraPriceTracker.exe
echo ===================================================
pause
