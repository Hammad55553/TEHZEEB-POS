-- ============================================================
-- Tahzeeb Sweets & Super Store - POS
-- PostgreSQL schema (fully local / offline)
-- ============================================================

-- Users (replaces Database Auth). Passwords hashed with bcrypt.
CREATE TABLE IF NOT EXISTS users (
    id          BIGSERIAL PRIMARY KEY,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,               -- bcrypt hash
    name        TEXT,
    role        TEXT DEFAULT 'cashier',      -- admin | manager | cashier
    status      TEXT DEFAULT 'active',       -- active | disabled
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Inventory / products
CREATE TABLE IF NOT EXISTS inventory (
    id            BIGSERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    category      TEXT,
    barcode       TEXT,
    batch_no      TEXT,
    price         NUMERIC(12,2) DEFAULT 0,
    wholesale_price NUMERIC(12,2) DEFAULT 0,
    buy_price     NUMERIC(12,2) DEFAULT 0,
    cost_price    NUMERIC(12,2) DEFAULT 0,
    sale_price    NUMERIC(12,2) DEFAULT 0,
    stock         NUMERIC(12,2) DEFAULT 0,
    initial_stock NUMERIC(12,2) DEFAULT 0,
    total_sold    NUMERIC(12,2) DEFAULT 0,
    min_stock     NUMERIC(12,2) DEFAULT 5,
    expiry        TEXT,
    critical_days INTEGER DEFAULT 60,
    manufacturer  TEXT,
    image         TEXT,
    sell_type     TEXT DEFAULT 'piece',
    unit          TEXT DEFAULT 'pcs',        -- pcs | kg | dozen | box
    low_stock     NUMERIC(12,2) DEFAULT 5,
    expiry_date   DATE,
    supplier      TEXT,
    data          JSONB DEFAULT '{}'::jsonb, -- any extra fields the UI stores
    deleted_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Customers (khata / credit)
CREATE TABLE IF NOT EXISTS customers (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    phone       TEXT,
    address     TEXT,
    balance     NUMERIC(12,2) DEFAULT 0,
    history     JSONB DEFAULT '[]'::jsonb,
    data        JSONB DEFAULT '{}'::jsonb,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    phone       TEXT,
    company     TEXT,
    balance     NUMERIC(12,2) DEFAULT 0,
    history     JSONB DEFAULT '[]'::jsonb,
    data        JSONB DEFAULT '{}'::jsonb,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Sales (a receipt / bill)
CREATE TABLE IF NOT EXISTS sales (
    id            BIGSERIAL PRIMARY KEY,
    invoice_no    TEXT,
    customer_id   BIGINT,
    customer_name TEXT,
    subtotal      NUMERIC(12,2) DEFAULT 0,
    discount      NUMERIC(12,2) DEFAULT 0,
    tax           NUMERIC(12,2) DEFAULT 0,
    total         NUMERIC(12,2) DEFAULT 0,
    paid          NUMERIC(12,2) DEFAULT 0,
    change_due    NUMERIC(12,2) DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',      -- cash | card | easypaisa | jazzcash | credit
    profit        NUMERIC(12,2) DEFAULT 0,
    cashier       TEXT,
    shift_id      BIGINT,
    data          JSONB DEFAULT '{}'::jsonb,
    deleted_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT now()
);

-- Sale line items (child of sales)
CREATE TABLE IF NOT EXISTS sale_items (
    id            BIGSERIAL PRIMARY KEY,
    sale_id       BIGINT REFERENCES sales(id) ON DELETE CASCADE,
    inventory_id  BIGINT,
    name          TEXT,
    qty           NUMERIC(12,2) DEFAULT 1,
    price         NUMERIC(12,2) DEFAULT 0,
    cost_price    NUMERIC(12,2) DEFAULT 0,
    total         NUMERIC(12,2) DEFAULT 0,
    data          JSONB DEFAULT '{}'::jsonb
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id          BIGSERIAL PRIMARY KEY,
    title       TEXT,
    category    TEXT,
    amount      NUMERIC(12,2) DEFAULT 0,
    note        TEXT,
    data        JSONB DEFAULT '{}'::jsonb,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Shifts (cash register open/close)
CREATE TABLE IF NOT EXISTS shifts (
    id            BIGSERIAL PRIMARY KEY,
    cashier       TEXT,
    staff_name    TEXT,
    staff_id      BIGINT,
    opening_cash  NUMERIC(12,2) DEFAULT 0,
    closing_cash  NUMERIC(12,2),
    total_sales   NUMERIC(12,2) DEFAULT 0,
    sales         NUMERIC(12,2) DEFAULT 0,
    expenses      NUMERIC(12,2) DEFAULT 0,
    status        TEXT DEFAULT 'open',       -- open | closed
    data          JSONB DEFAULT '{}'::jsonb,
    opened_at     TIMESTAMPTZ DEFAULT now(),
    closed_at     TIMESTAMPTZ,
    start_time    TIMESTAMPTZ,
    end_time      TIMESTAMPTZ
);

-- Shortage book (items short at counter)
CREATE TABLE IF NOT EXISTS shortage (
    id            BIGSERIAL PRIMARY KEY,
    name          TEXT,
    inventory_id  BIGINT,
    qty           NUMERIC(12,2) DEFAULT 0,
    note          TEXT,
    resolved      BOOLEAN DEFAULT false,
    data          JSONB DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ DEFAULT now()
);

-- Supply orders to suppliers
CREATE TABLE IF NOT EXISTS orders (
    id            BIGSERIAL PRIMARY KEY,
    supplier      TEXT,
    supplier_id   BIGINT,
    items         JSONB DEFAULT '[]'::jsonb,
    total         NUMERIC(12,2) DEFAULT 0,
    status        TEXT DEFAULT 'pending',    -- pending | received | cancelled
    notes         TEXT,
    data          JSONB DEFAULT '{}'::jsonb,
    deleted_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_deleted ON inventory(deleted_at);
CREATE INDEX IF NOT EXISTS idx_sales_deleted     ON sales(deleted_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale   ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_customers_deleted ON customers(deleted_at);


-- Extra columns used by the frontend (added for compatibility)
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS price          NUMERIC(12,2) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC(12,2) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS buy_price      NUMERIC(12,2) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS sell_type      TEXT DEFAULT 'piece';
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS min_stock      NUMERIC(12,2) DEFAULT 5;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS tax_percent    NUMERIC(6,2)  DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS manufacturer   TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS batch_no       TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS expiry         TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS critical_days  INTEGER DEFAULT 60;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS total_sold     NUMERIC(12,2) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS restock_history JSONB DEFAULT '[]'::jsonb;

-- sale_items: frontend uses product_id / buy_price / reason
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS product_id BIGINT;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS buy_price  NUMERIC(12,2) DEFAULT 0;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS reason     TEXT;

-- sales: frontend uses seller_name, payment_details, status, product_name
ALTER TABLE sales ADD COLUMN IF NOT EXISTS seller_name     TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_details JSONB;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS status          TEXT DEFAULT 'Paid';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS product_name    TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS sales           NUMERIC(12,2) DEFAULT 0;

-- shifts: frontend uses sales, staff_id, staffName
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS sales    NUMERIC(12,2) DEFAULT 0;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS staff_id BIGINT;

-- users: frontend uses permissions, uid
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;

ALTER TABLE inventory ADD COLUMN IF NOT EXISTS image TEXT;

-- Party module: tasks, promises, salaries
CREATE TABLE IF NOT EXISTS tasks (
    id BIGSERIAL PRIMARY KEY,
    title TEXT,
    party_id BIGINT,
    party_name TEXT,
    due_date DATE,
    status TEXT DEFAULT 'pending',
    note TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS promises (
    id BIGSERIAL PRIMARY KEY,
    party_id BIGINT,
    party_name TEXT,
    amount NUMERIC(12,2) DEFAULT 0,
    promise_date DATE,
    status TEXT DEFAULT 'pending',
    note TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS salaries (
    id BIGSERIAL PRIMARY KEY,
    employee_name TEXT,
    month TEXT,
    basic NUMERIC(12,2) DEFAULT 0,
    bonus NUMERIC(12,2) DEFAULT 0,
    deduction NUMERIC(12,2) DEFAULT 0,
    net NUMERIC(12,2) DEFAULT 0,
    paid BOOLEAN DEFAULT false,
    note TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Stock movements: adjustments, transfers, purchase returns (audit log)
CREATE TABLE IF NOT EXISTS stock_moves (
    id BIGSERIAL PRIMARY KEY,
    move_type TEXT,              -- adjustment | transfer | purchase_return
    product_id BIGINT,
    product_name TEXT,
    qty NUMERIC(12,2) DEFAULT 0,
    from_loc TEXT,
    to_loc TEXT,
    reason TEXT,
    done_by TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Orders module: order type + party
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type   TEXT DEFAULT 'purchase_order';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS party_name   TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS party_id     BIGINT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS expected_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS done_by      TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS parent_id BIGINT REFERENCES inventory(id);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS pack_qty NUMERIC(12,2) DEFAULT 1;

-- ============================================================
-- PERFORMANCE INDEXES (added to fix slow loading on Reports,
-- Expiry, Suppliers, Stock, Transfer, Adjustment screens)
-- ============================================================
-- Inventory
CREATE INDEX IF NOT EXISTS idx_inventory_expiry_date ON inventory(expiry_date);
CREATE INDEX IF NOT EXISTS idx_inventory_category    ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier    ON inventory(supplier);
CREATE INDEX IF NOT EXISTS idx_inventory_created      ON inventory(created_at);
-- Sales / sale_items
CREATE INDEX IF NOT EXISTS idx_sales_created         ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_status          ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sale_items_product    ON sale_items(product_id);
-- Stock moves (transfer / adjustment reports)
CREATE INDEX IF NOT EXISTS idx_stock_moves_type      ON stock_moves(move_type);
CREATE INDEX IF NOT EXISTS idx_stock_moves_product   ON stock_moves(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_deleted   ON stock_moves(deleted_at);
CREATE INDEX IF NOT EXISTS idx_stock_moves_created   ON stock_moves(created_at);
-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_status         ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_supplier_id    ON orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_orders_deleted        ON orders(deleted_at);
CREATE INDEX IF NOT EXISTS idx_orders_created        ON orders(created_at);
-- Expenses
CREATE INDEX IF NOT EXISTS idx_expenses_created      ON expenses(created_at);
CREATE INDEX IF NOT EXISTS idx_expenses_deleted      ON expenses(deleted_at);
-- Suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_deleted     ON suppliers(deleted_at);

-- shortage: frontend uses demand_count / status / notes (add for compatibility)
ALTER TABLE shortage ADD COLUMN IF NOT EXISTS demand_count INTEGER DEFAULT 1;
ALTER TABLE shortage ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE shortage ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
