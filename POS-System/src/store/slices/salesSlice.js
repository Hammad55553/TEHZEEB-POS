import { createSlice } from '@reduxjs/toolkit';

const salesSlice = createSlice({
    name: 'sales',
    initialState: {
        history: []
    },
    reducers: {
        addSale: (state, action) => {
            state.history.unshift(action.payload);
        },
        returnSale: (state, action) => {
            const sale = state.history.find(s => s.id === action.payload);
            if (sale) {
                sale.status = 'Returned';
            }
        },
        setSales: (state, action) => {
            state.history = action.payload;
        },
        deleteSale: (state, action) => {
            state.history = state.history.filter(s => s.id !== action.payload);
        }
    }
});

export const { addSale, returnSale, setSales, deleteSale } = salesSlice.actions;
export default salesSlice.reducer;
