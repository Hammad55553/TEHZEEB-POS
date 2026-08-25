"""Entry point: python run.py  (starts the local POS backend)."""
import uvicorn
from app import config

if __name__ == "__main__":
    print(f"Starting {config.APP_NAME} backend on http://{config.HOST}:{config.PORT}")
    uvicorn.run("app.main:app", host=config.HOST, port=config.PORT, reload=False)
