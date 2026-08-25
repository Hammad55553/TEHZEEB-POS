import { createSlice } from '@reduxjs/toolkit';

const salesSlice = createSlice({
    name: 'sales',
    initialState: {
        history: JSON.parse(localStorage.getItem('tehzeeb_sales')) || []
    },
    reducers: {
        addSale: (state, action) => {
            state.history.unshift(action.payload);
            localStorage.setItem('tehzeeb_sales', JSON.stringify(state.history));
        },
        returnSale: (state, action) => {
            const sale = state.history.find(s => s.id === action.payload);
            if (sale) {
                sale.status = 'Returned';
            }
            localStorage.setItem('tehzeeb_sales', JSON.stringify(state.history));
        },
        setSales: (state, action) => {
            state.history = action.payload;
            localStorage.setItem('tehzeeb_sales', JSON.stringify(state.history));
        },
        deleteSale: (state, action) => {
            state.history = state.history.filter(s => s.id !== action.payload);
            localStorage.setItem('tehzeeb_sales', JSON.stringify(state.history));
        }
    }
});

export const { addSale, returnSale, setSales, deleteSale } = salesSlice.actions;
export default salesSlice.reducer;
