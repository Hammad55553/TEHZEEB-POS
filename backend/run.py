"""Entry point: python run.py  (starts the local POS backend)."""
import gc
import uvicorn
from app import config
from app.main import app

# Keep memory lean for a long-running local server.
gc.set_threshold(300, 5, 5)

if __name__ == "__main__":
    print(f"Starting {config.APP_NAME} backend on http://{config.HOST}:{config.PORT}")
    # NOTE: when passing the app object directly (as here, required for the
    # packaged .exe), do NOT use workers=... — it needs an import string and
    # breaks startup in a frozen exe. Keep only settings that are safe here.
    uvicorn.run(
        app,
        host=config.HOST,
        port=config.PORT,
        reload=False,
        access_log=False,          # don't accumulate/print access logs
        log_level="warning",       # minimal logging
        timeout_keep_alive=5,      # drop idle keep-alive connections quickly
    )
