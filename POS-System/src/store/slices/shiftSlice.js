import { createSlice } from '@reduxjs/toolkit';

const shiftSlice = createSlice({
    name: 'shift',
    initialState: {
        activeShift: JSON.parse(localStorage.getItem('tehzeeb_shift')) || null,
        history: JSON.parse(localStorage.getItem('tehzeeb_shift_history')) || []
    },
    reducers: {
        startShift: (state, action) => {
            const newShift = {
                id: action.payload.id || Date.now(),
                startTime: action.payload.start_time || new Date().toISOString(),
                staffName: action.payload.staff_name || action.payload.staffName,
                openingCash: action.payload.opening_cash || action.payload.openingCash,
                sales: 0,
                expenses: 0,
                status: 'Open'
            };
            state.activeShift = newShift;
            localStorage.setItem('tehzeeb_shift', JSON.stringify(newShift));
        },
        endShift: (state, action) => {
            if (state.activeShift) {
                const closedShift = {
                    ...state.activeShift,
                    endTime: new Date().toISOString(),
                    closingCash: action.payload.closingCash,
                    status: 'Closed'
                };
                state.history.unshift(closedShift);
                state.activeShift = null;
                localStorage.removeItem('tehzeeb_shift');
                localStorage.setItem('tehzeeb_shift_history', JSON.stringify(state.history));
            }
        },
        updateShiftStats: (state, action) => {
            if (state.activeShift) {
                state.activeShift.sales += action.payload.sale || 0;
                state.activeShift.expenses += action.payload.expense || 0;
                localStorage.setItem('tehzeeb_shift', JSON.stringify(state.activeShift));
            }
        },
        setShifts: (state, action) => {
            state.history = action.payload.history;
            state.activeShift = action.payload.activeShift || null;
            localStorage.setItem('tehzeeb_shift_history', JSON.stringify(state.history));
            if (state.activeShift) {
                localStorage.setItem('tehzeeb_shift', JSON.stringify(state.activeShift));
            } else {
                localStorage.removeItem('tehzeeb_shift');
            }
        },
        deleteShift: (state, action) => {
            state.history = state.history.filter(s => s.id !== action.payload);
            localStorage.setItem('tehzeeb_shift_history', JSON.stringify(state.history));
        }
    }
});

export const { startShift, endShift, updateShiftStats, setShifts, deleteShift } = shiftSlice.actions;
export default shiftSlice.reducer;
