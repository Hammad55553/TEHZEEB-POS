import { createSlice } from '@reduxjs/toolkit';

const shortageSlice = createSlice({
    name: 'shortage',
    initialState: {
        items: []
    },
    reducers: {
        addToShortage: (state, action) => {
            // Payload is the real Database row (id, name, demand_count, status,
            // created_at, notes). Prepend it so the list matches the DB exactly.
            state.items.unshift(action.payload);
        },
        updateShortageStatus: (state, action) => {
            const item = state.items.find(i => i.id === action.payload.id);
            if (item) {
                item.status = action.payload.status;
            }
        },
        removeFromShortage: (state, action) => {
            state.items = state.items.filter(i => i.id !== action.payload);
        },
        setShortageItems: (state, action) => {
            state.items = action.payload;
        }
    }
});

export const { addToShortage, updateShortageStatus, removeFromShortage, setShortageItems } = shortageSlice.actions;
export default shortageSlice.reducer;
