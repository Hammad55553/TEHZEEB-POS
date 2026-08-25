import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: JSON.parse(localStorage.getItem('pso_user')) || null,
        isAuthenticated: !!localStorage.getItem('pso_user')
    },
    reducers: {
        login: (state, action) => {
            state.user = action.payload;
            state.isAuthenticated = true;
            localStorage.setItem('pso_user', JSON.stringify(action.payload));
        },
        logout: (state) => {
            state.user = null;
            state.isAuthenticated = false;
            localStorage.removeItem('pso_user');
        }
    }
});

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;
