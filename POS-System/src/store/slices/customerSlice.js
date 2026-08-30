import { createSlice } from '@reduxjs/toolkit';

const customerSlice = createSlice({
    name: 'customers',
    initialState: {
        list: []
    },
    reducers: {
        setCustomers: (state, action) => {
            state.list = action.payload;
        },
        addCustomer: (state, action) => {
            state.list.push({ ...action.payload, balance: 0, history: [] });
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
        },
        deleteCustomer: (state, action) => {
            state.list = state.list.filter(c => c.id !== action.payload);
        },
        editCustomer: (state, action) => {
            const index = state.list.findIndex(c => c.id === action.payload.id);
            if (index !== -1) {
                state.list[index] = { ...state.list[index], ...action.payload };
            }
        }
    }
});

export const { addCustomer, updateBalance, setCustomers, deleteCustomer, editCustomer } = customerSlice.actions;
export default customerSlice.reducer;
