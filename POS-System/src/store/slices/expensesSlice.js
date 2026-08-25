import { createSlice } from '@reduxjs/toolkit';

const expensesSlice = createSlice({
    name: 'expenses',
    initialState: {
        list: []
    },
    reducers: {
        addExpense: (state, action) => {
            // Payload is the real row returned by Database (has id, title,
            // notes, category, amount, created_at, added_by). Just prepend it
            // so the list matches the database exactly.
            state.list.unshift(action.payload);
        },
        removeExpense: (state, action) => {
            state.list = state.list.filter(e => e.id !== action.payload);
        },
        setExpenses: (state, action) => {
            state.list = action.payload;
        }
    }
});

export const { addExpense, removeExpense, setExpenses } = expensesSlice.actions;
export default expensesSlice.reducer;
