import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User } from "@/types/user";

export type AuthSliceState = {
  username?: string;
  email?: string;
  token?: string;
};

export const authSlice = createSlice({
  name: "auth",
  initialState: {},
  reducers: {
    login: (_state, action: PayloadAction<User>) => {
      return { ...action.payload };
    },
    logout: () => {
      return {};
    },
    rehydrateFromStorage: (state: AuthSliceState) => {
      const token = localStorage.getItem("token");
      if (token) {
        return { ...state, token };
      }
      return state;
    },
  },
});

export const actions = authSlice.actions;

export const selectIsAuthed = (state: AuthSliceState) => Boolean(state.token);

export default authSlice.reducer;
