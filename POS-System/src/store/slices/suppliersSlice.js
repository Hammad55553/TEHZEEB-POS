import { createSlice } from '@reduxjs/toolkit';

const suppliersSlice = createSlice({
    name: 'suppliers',
    initialState: {
        list: []
    },
    reducers: {
        addSupplier: (state, action) => {
            state.list.push({
                id: `SUP-${Date.now()}`,
                name: action.payload.name,
                contact: action.payload.contact,
                company: action.payload.company,
                balance: parseFloat(action.payload.balance) || 0,
                history: action.payload.balance > 0 ? [{
                    date: new Date().toISOString(),
                    type: 'Opening Balance',
                    amount: parseFloat(action.payload.balance),
                    note: 'Account Created'
                }] : []
            });
        },
        updateSupplierBalance: (state, action) => {
            const supplier = state.list.find(s => s.id === action.payload.id);
            if (supplier) {
                const amount = parseFloat(action.payload.amount);
                if (action.payload.type === 'purchase') {
                    supplier.balance += amount;
                } else if (action.payload.type === 'payment') {
                    supplier.balance -= amount;
                }
                supplier.history.unshift({
                    date: new Date().toISOString(),
                    type: action.payload.type === 'purchase' ? 'Stock Purchase' : 'Payment Made',
                    amount: amount,
                    note: action.payload.note || ''
                });
            }
        },
        removeSupplier: (state, action) => {
            state.list = state.list.filter(s => s.id !== action.payload);
        },
        setSuppliers: (state, action) => {
            state.list = action.payload;
        }
    }
});

export const { addSupplier, updateSupplierBalance, removeSupplier, setSuppliers } = suppliersSlice.actions;
export default suppliersSlice.reducer;
