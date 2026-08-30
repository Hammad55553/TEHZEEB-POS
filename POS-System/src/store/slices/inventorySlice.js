import { createSlice } from '@reduxjs/toolkit';

const inventorySlice = createSlice({
    name: 'inventory',
    initialState: {
        items: []
    },
    reducers: {
        addItem: (state, action) => {
            const newItem = {
                ...action.payload,
                initial_stock: action.payload.stock || 0,
                restock_history: [],
                total_sold: 0
            };
            state.items.push(newItem);
        },
        updateStock: (state, action) => {
            const { id, quantity, mode } = action.payload;
            const item = state.items.find(i => i.id === id);
            if (item) {
                if (mode === 'add') {
                    item.stock += quantity;
                    if (!item.restock_history) item.restock_history = [];
                    item.restock_history.push({
                        date: new Date().toISOString(),
                        quantity: quantity,
                        prev_stock: item.stock - quantity,
                        new_stock: item.stock
                    });
                }
                else if (mode === 'remove') {
                    item.stock -= quantity;
                    item.total_sold = (item.total_sold || 0) + quantity;
                }
            }
        },
        editItem: (state, action) => {
            const index = state.items.findIndex(i => i.id === action.payload.id);
            if (index !== -1) {
                state.items[index] = {
                    ...state.items[index],
                    ...action.payload
                };
            }
        },
        setInventory: (state, action) => {
            state.items = action.payload;
        },
        deleteItem: (state, action) => {
            state.items = state.items.filter(i => i.id !== action.payload);
        }
    }
});

export const { addItem, updateStock, editItem, setInventory, deleteItem } = inventorySlice.actions;
export default inventorySlice.reducer;
