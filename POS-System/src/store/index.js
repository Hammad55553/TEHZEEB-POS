import { configureStore } from '@reduxjs/toolkit';
import inventoryReducer from './slices/inventorySlice';
import salesReducer from './slices/salesSlice';
import shiftReducer from './slices/shiftSlice';
import customerReducer from './slices/customerSlice';
import authReducer from './slices/authSlice';
import ordersReducer from './slices/ordersSlice';
import shortageReducer from './slices/shortageSlice';
import expensesReducer from './slices/expensesSlice';
import suppliersReducer from './slices/suppliersSlice';
import uiReducer from './slices/uiSlice';

// 1. No longer preload a giant localStorage blob into memory. Data loads from
// the local PostgreSQL DB on startup. We also proactively clear old cached
// blobs so upgraded installs release that memory/disk.
try {
    localStorage.removeItem('tehzeeb_pos_state');
    localStorage.removeItem('tehzeeb_inventory');
    localStorage.removeItem('tehzeeb_sales');
    localStorage.removeItem('tehzeeb_customers');
    localStorage.removeItem('tehzeeb_shift');
    localStorage.removeItem('tehzeeb_shift_history');
} catch (e) { /* ignore */ }

const persistedState = undefined;

export const store = configureStore({
    reducer: {
        inventory: inventoryReducer,
        sales: salesReducer,
        shift: shiftReducer,
        customers: customerReducer,
        auth: authReducer,
        orders: ordersReducer,
        shortage: shortageReducer,
        expenses: expensesReducer,
        suppliers: suppliersReducer,
        ui: uiReducer
    },
    preloadedState: persistedState
});

// 2. Save data to LocalStorage — DEBOUNCED.
// Previously this ran on EVERY Redux change and serialized the whole state
// (190 inventory + 100+ sales + everything) each time, which caused noticeable
// lag during rapid UI updates. Now we wait until changes settle (500ms) and
// write once. We also skip the transient `ui` slice (calculator open/close etc.)
// since it doesn't need to survive reloads.
// MEMORY/SPEED: We run fully offline on PostgreSQL, so the heavy tables
// (inventory, sales, customers, orders, expenses, suppliers, shortage) do NOT
// need a second copy in localStorage — that duplicate kept memory high and
// serialized megabytes of JSON on every change. Data now comes straight from
// the local DB. We keep only tiny, non-DB UI/session bits in localStorage.
// (auth token is handled separately in database.js.)
//
// No global store.subscribe persister anymore.
