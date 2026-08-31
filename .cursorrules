# AI OPTIMIZATION RULES — Tehzeeb POS

> **READ THIS FIRST** before changing any code in this project.
> This app runs on shop counters. It MUST stay light: small EXE, low memory,
> low server load. Any AI tool (or human) working here must follow these rules.

---

## THE 3 HARD RULES

1. **EXE size must NOT grow.** Do not add new npm/pip libraries unless truly
   required. Prefer plain JS/CSS and built-in helpers over adding packages.
2. **Memory must stay low.** The frontend (EXE) and the backend (server.exe)
   should each stay in the low hundreds of MB — NEVER gigabytes.
3. **Server load must stay low.** The Python backend only serves one local shop.
   Never make it do heavy work or return huge result sets.

---

## FRONTEND (React / POS-System)

### Never load or render "all" data at once
- **NEVER** `db.from('table').select('*')` without a `.limit()`.
- On any screen that lists rows (Products, Orders, Expiry, Suppliers, Stock,
  Party, Users, Reports): **paginate** the render to **100 rows per page** using
  the shared component `src/components/Pagination.jsx`.
- Search boxes: cap results (e.g. top 50) and stop early — never render hundreds
  of cards.

### Sales are the biggest table — treat with care
- **NEVER** load all sales. Especially never `sales` + `sale_items(*)` unbounded.
- Reports load only the **selected date range** (server-side `gte`/`lte` on
  `created_at`) plus a safety `.limit()`.
- Any per-user / per-product count over sales: cap the rows (e.g. `.limit(3000)`).

### Prefer Redux over re-fetching
- Products/customers/suppliers/orders/sales already live in Redux
  (`state.*`). Read from Redux first; only hit the DB for a background refresh
  (with a `.limit()`), never a blocking full load.

### Do NOT duplicate data in localStorage
- We run fully offline on PostgreSQL. Do **not** mirror tables into
  `localStorage` (it pins memory and serializes megabytes). Only tiny per-device
  bits (auth token, license key) belong in localStorage.

### Avoid per-row animations on long lists
- Do **not** wrap every list row in `framer-motion` (`motion.div` with per-index
  delays). Use plain `<div>`/`<tr>` for lists — animation on hundreds of rows
  eats memory and CPU. Keep motion for modals only.

### Memoize filters
- Wrap list filtering in `useMemo` keyed on the real inputs, so it doesn't
  recompute the whole list on every render.

---

## BACKEND (Python / FastAPI — backend/)

### uvicorn.run — DO NOT add workers
- The server passes the `app` object directly (required for the packaged
  `server.exe`). **NEVER** add `workers=...` or `limit_concurrency=...` to
  `uvicorn.run(app, ...)` — with an app object these need an import string and
  **break startup in the frozen exe** (server won't come back up).
- Safe settings only: `access_log=False`, `log_level="warning"`,
  `timeout_keep_alive=5`, and `gc.set_threshold(...)`.

### Keep queries bounded
- Endpoints that list rows must use `LIMIT` (sales/orders/moves = 100–200,
  others ≤ 500–1000). Never `SELECT *` a big table with no limit.
- Embeds (e.g. `sale_items`) are already batched — keep it that way; do not add
  N+1 loops.

### Build stays lean (CI: .github/workflows/electron.yml)
- Keep `pyinstaller --onefile` (changing packaging is risky).
- Keep the `--exclude-module tkinter/test/unittest/pydoc --strip` flags.
- Do **not** add heavy Python libs (pandas, numpy, matplotlib, etc.). Use plain
  SQL + stdlib.
- Keep `uvicorn` (plain), not `uvicorn[standard]` (the extras add memory/size).

---

## DATABASE / COLUMNS

- The frontend and DB column names must match. When a screen "does nothing"
  (add/status/delete silently fails) it's almost always a **column-name
  mismatch** — check `schema.sql` vs the field names the UI reads/writes.
- Add new columns via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` in
  `schema.sql` (it runs on startup). Never rename/drop existing columns.

---

## LICENSING (do not break)
- Per-shop license in `licenses.json` (GitHub) + hidden `license.key` on the PC.
- `owner:true` = never locks. `no_offline_lock:true` = trusted shop, never locks
  when offline. Others: lock on remote flag / expiry / >7 days offline.
- **A locked app NEVER deletes data — it only shows a message.** Keep it that way.

---

## PROCESS

- **One AI tool at a time.** Two tools editing together causes git merge
  conflicts (`<<<<<<<` markers) and broken files. Commit + push after each change.
- After any change: it must **compile clean**. Do not increase EXE size or memory.
- If unsure whether a change adds weight — **don't add it.**

---

*Keep this file up to date. If you optimize something, note the pattern here so
the next tool follows it.*
