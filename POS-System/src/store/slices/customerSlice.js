import { createSlice } from '@reduxjs/toolkit';

const customerSlice = createSlice({
    name: 'customers',
    initialState: {
        list: JSON.parse(localStorage.getItem('tehzeeb_customers')) || []
    },
    reducers: {
        setCustomers: (state, action) => {
            state.list = action.payload;
            localStorage.setItem('tehzeeb_customers', JSON.stringify(state.list));
        },
        addCustomer: (state, action) => {
            state.list.push({ ...action.payload, balance: 0, history: [] });
            localStorage.setItem('tehzeeb_customers', JSON.stringify(state.list));
        },
        updateBalance: (state, action) => {
            const { id, amount, type, note } = action.payload; // type: 'credit' or 'payment'
            const customer = state.list.find(c => c.id === id);
            if (customer) {
                if (type === 'credit') customer.balance += amount;
                else if (type === 'payment') customer.balance -= amount;

                customer.history.unshift({
                    date: new Date().toISOString(),
                    amount,
                    type,
                    note
                });
            }
            localStorage.setItem('tehzeeb_customers', JSON.stringify(state.list));
        },
        deleteCustomer: (state, action) => {
            state.list = state.list.filter(c => c.id !== action.payload);
            localStorage.setItem('tehzeeb_customers', JSON.stringify(state.list));
        },
        editCustomer: (state, action) => {
            const index = state.list.findIndex(c => c.id === action.payload.id);
            if (index !== -1) {
                state.list[index] = { ...state.list[index], ...action.payload };
                localStorage.setItem('tehzeeb_customers', JSON.stringify(state.list));
            }
        }
    }
});

export const { addCustomer, updateBalance, setCustomers, deleteCustomer, editCustomer } = customerSlice.actions;
export default customerSlice.reducer;
