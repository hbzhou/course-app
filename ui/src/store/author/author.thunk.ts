import { AppDispatch } from "@/store/store";
import { actions } from "./author.slice";
import { Author } from "@/types/author";

export const fetchAuthors = () => async (dispatch: AppDispatch) => {
  const token = localStorage.getItem("token") ?? "";
  const response = await fetch("/api/authors", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch authors: ${response.status} ${response.statusText}`);
  }

  const authors: Author[] = await response.json();
  dispatch(actions.setAuthors(authors));
};

export const createAuthor = (name: string) => async (dispatch: AppDispatch) => {
  const token = localStorage.getItem("token") ?? "";
  const response = await fetch("/api/authors", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to create author: ${response.status} ${response.statusText}`);
  }

  const createdAuthor: Author = await response.json();
  dispatch(actions.addAuthor(createdAuthor));
  return createdAuthor;
};

export const updateAuthor = (author: Author) => async (dispatch: AppDispatch) => {
  const token = localStorage.getItem("token") ?? "";
  const response = await fetch(`/api/authors/${author.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name: author.name }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to update author: ${response.status} ${response.statusText}`);
  }

  const updatedAuthor: Author = await response.json();
  dispatch(actions.updateAuthor(updatedAuthor));
  return updatedAuthor;
};

export const deleteAuthor = (authorId: string) => async (dispatch: AppDispatch) => {
  const token = localStorage.getItem("token") ?? "";
  const response = await fetch(`/api/authors/${authorId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to delete author: ${response.status} ${response.statusText}`);
  }

  dispatch(actions.removeAuthor(authorId));
  return authorId;
};
