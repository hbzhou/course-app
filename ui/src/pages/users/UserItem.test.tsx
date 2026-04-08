import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import UserItem from "./UserItem";

describe("UserItem", () => {
  const mockUser = {
    id: 1,
    username: "testuser",
    email: "test@example.com",
    roles: [
      { id: 1, name: "ROLE_USER" },
      { id: 2, name: "ROLE_ADMIN" },
    ],
  };

  const mockOnEdit = vi.fn();
  const mockOnRemove = vi.fn();

  it("renders user information", () => {
    render(
      <UserItem
        {...mockUser}
        onEdit={mockOnEdit}
        onRemove={mockOnRemove}
      />
    );

    expect(screen.getByText("testuser")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByText("ROLE_USER")).toBeInTheDocument();
    expect(screen.getByText("ROLE_ADMIN")).toBeInTheDocument();
  });

  it("calls onEdit when edit button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <UserItem
        {...mockUser}
        onEdit={mockOnEdit}
        onRemove={mockOnRemove}
      />
    );

    const editButton = screen.getByRole("button", { name: /edit/i });
    await user.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(mockUser);
  });

  it("calls onRemove when remove button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <UserItem
        {...mockUser}
        onEdit={mockOnEdit}
        onRemove={mockOnRemove}
      />
    );

    const removeButton = screen.getByRole("button", { name: /remove/i });
    await user.click(removeButton);

    expect(mockOnRemove).toHaveBeenCalledWith(mockUser);
  });

  it("disables buttons when isRemoving is true", () => {
    render(
      <UserItem
        {...mockUser}
        onEdit={mockOnEdit}
        onRemove={mockOnRemove}
        isRemoving={true}
      />
    );

    const editButton = screen.getByRole("button", { name: /edit/i });
    const removeButton = screen.getByRole("button", { name: /removing/i });

    expect(editButton).toBeDisabled();
    expect(removeButton).toBeDisabled();
  });

  it("renders multiple roles correctly", () => {
    const multiRoleUser = {
      ...mockUser,
      roles: [
        { id: 1, name: "ROLE_USER" },
        { id: 2, name: "ROLE_ADMIN" },
        { id: 3, name: "ROLE_MODERATOR" },
      ],
    };

    render(
      <UserItem
        {...multiRoleUser}
        onEdit={mockOnEdit}
        onRemove={mockOnRemove}
      />
    );

    expect(screen.getByText("ROLE_USER")).toBeInTheDocument();
    expect(screen.getByText("ROLE_ADMIN")).toBeInTheDocument();
    expect(screen.getByText("ROLE_MODERATOR")).toBeInTheDocument();
  });
});
