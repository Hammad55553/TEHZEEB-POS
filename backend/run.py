"""Entry point: python run.py  (starts the local POS backend)."""
import gc
import uvicorn
from app import config
from app.main import app

# Keep memory lean for a long-running local server:
# - aggressive garbage collection thresholds so freed objects are reclaimed
gc.set_threshold(300, 5, 5)

if __name__ == "__main__":
    print(f"Starting {config.APP_NAME} backend on http://{config.HOST}:{config.PORT}")
    uvicorn.run(
        app,
        host=config.HOST,
        port=config.PORT,
        reload=False,
        workers=1,                 # single process (local single-shop server)
        access_log=False,          # don't accumulate/print access logs
        log_level="warning",       # minimal logging
        limit_concurrency=50,      # cap simultaneous requests (prevents runaway memory)
        timeout_keep_alive=5,      # drop idle keep-alive connections quickly
    )
