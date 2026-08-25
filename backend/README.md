# Tahzeeb Sweets & Super Store - POS  (Local Backend)

Python **FastAPI + PostgreSQL**, fully offline. No cloud, no Database, no Firebase.

## One-time setup

1. Install PostgreSQL locally and make sure it's running.
   - macOS (Homebrew): `brew install postgresql@16 && brew services start postgresql@16`
2. Install Python deps:
   ```
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
3. (Optional) copy `.env.example` to `.env` and set your Postgres user/password.
   Defaults: user `postgres`, password `postgres`, db `tahzeeb_pos` (auto-created).

## Run the backend

```
cd backend
source venv/bin/activate
python run.py
```
It starts on http://127.0.0.1:8000 , auto-creates the database + tables, and
creates a default admin:

- **email:** admin@tahzeeb.com
- **password:** admin123   (change it from Settings after first login)

## Run the POS app

In another terminal:
```
cd POS-System
npm install
npm run dev          # web/dev
# or
npm run electron:dev # desktop app
```

The frontend automatically talks to http://127.0.0.1:8000 . To change the URL,
set `window.__POS_API_BASE__` before the app loads.
