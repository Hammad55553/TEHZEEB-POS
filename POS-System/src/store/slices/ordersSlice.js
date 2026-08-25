import { createSlice } from '@reduxjs/toolkit';

const ordersSlice = createSlice({
  name: 'orders',
  initialState: {
    list: [],
    loading: false
  },
  reducers: {
    setOrders: (state, action) => {
      state.list = action.payload;
    },
    addOrder: (state, action) => {
      state.list.unshift(action.payload);
    },
    updateOrderStatus: (state, action) => {
      const { id, status } = action.payload;
      const order = state.list.find(o => o.id === id);
      if (order) order.status = status;
    },
    deleteOrder: (state, action) => {
      state.list = state.list.filter(o => o.id !== action.payload);
    }
  }
});

export const { setOrders, addOrder, updateOrderStatus, deleteOrder } = ordersSlice.actions;
export default ordersSlice.reducer;
