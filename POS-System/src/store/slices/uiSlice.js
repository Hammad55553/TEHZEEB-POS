import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
    name: 'ui',
    initialState: {
        isCalculatorOpen: false,
    },
    reducers: {
        toggleCalculator: (state) => {
            state.isCalculatorOpen = !state.isCalculatorOpen;
        },
        openCalculator: (state) => {
            state.isCalculatorOpen = true;
        },
        closeCalculator: (state) => {
            state.isCalculatorOpen = false;
        }
    }
});

export const { toggleCalculator, openCalculator, closeCalculator } = uiSlice.actions;
export default uiSlice.reducer;
