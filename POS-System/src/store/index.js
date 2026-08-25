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

// 1. Load data from LocalStorage
const loadState = () => {
    try {
        const serializedState = localStorage.getItem('tehzeeb_pos_state');
        if (serializedState === null) return undefined;
        return JSON.parse(serializedState);
    } catch (err) {
        return undefined;
    }
};

const persistedState = loadState();

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
let saveTimer = null;
store.subscribe(() => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        try {
            const { ui, ...persistable } = store.getState();
            localStorage.setItem('tehzeeb_pos_state', JSON.stringify(persistable));
        } catch (err) {
            // Ignore write errors (e.g. storage quota exceeded).
        }
    }, 500);
});
