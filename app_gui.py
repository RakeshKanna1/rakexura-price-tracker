import os
import sys
import threading
import time
import uvicorn
import webview

def start_backend(app_obj):
    # Run the uvicorn server with the app object
    # Bind to 0.0.0.0 to allow access from other devices in the local network (like your phone)
    uvicorn.run(app_obj, host="0.0.0.0", port=8000, log_level="info")

if __name__ == "__main__":
    # Get base directory (check if running as PyInstaller bundle)
    if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
        base_dir = sys._MEIPASS
    else:
        base_dir = os.path.abspath(os.path.dirname(__file__))

    # Add backend directory to Python path
    backend_dir = os.path.abspath(os.path.join(base_dir, "backend"))
    sys.path.insert(0, backend_dir)
    
    # Change working directory to backend so that relative paths work correctly
    os.chdir(backend_dir)
    
    # Import app after paths are configured so PyInstaller detects all imports of the backend
    from main import app
    
    # Start backend in a daemon thread so it shuts down when the GUI closes
    backend_thread = threading.Thread(target=start_backend, args=(app,), daemon=True)
    backend_thread.start()
    
    # Give the backend a second to start up
    time.sleep(1.5)
    
    # Start the webview window
    webview.create_window(
        title="Rakexura Price Tracker",
        url="http://127.0.0.1:8000",
        width=1280,
        height=800,
        min_size=(1024, 768),
        resizable=True
    )
    webview.start()
