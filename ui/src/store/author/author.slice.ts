import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Author } from "@/types/author";

export type AuthorSliceState = Array<Author>;

const initialState: AuthorSliceState = [];

export const authorSlice = createSlice({
  name: "author",
  initialState,
  reducers: {
    setAuthors: (state: AuthorSliceState, action: PayloadAction<Array<Author>>) => {
      return [...action.payload];
    },
    addAuthor: (state: AuthorSliceState, action: PayloadAction<Author>) => {
      state.push(action.payload);
    },
    updateAuthor: (state: AuthorSliceState, action: PayloadAction<Author>) => {
      const index = state.findIndex((author) => author.id === action.payload.id);
      if (index !== -1) {
        state[index] = action.payload;
      }
    },
    removeAuthor: (state: AuthorSliceState, action: PayloadAction<string>) => {
      return state.filter((author) => author.id !== action.payload);
    },
  },
});

export default authorSlice.reducer;
export const actions = authorSlice.actions;
