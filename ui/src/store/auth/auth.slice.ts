import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User } from "@/types/user";

export type AuthSliceState = {
  username?: string;
  email?: string;
  token?: string;
};

const initialState: AuthSliceState = {};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (_state, action: PayloadAction<User>) => {
      return { ...action.payload };
    },
    logout: () => {
      return {};
    },
    setToken: (state: AuthSliceState, action: PayloadAction<string | undefined>) => {
      if (!action.payload) {
        return state;
      }

      return {
        ...state,
        token: action.payload,
      };
    },
  },
});

export const actions = authSlice.actions;

export const selectIsAuthed = (state: AuthSliceState) => Boolean(state.token);

export default authSlice.reducer;
