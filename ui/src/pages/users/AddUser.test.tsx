import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import AddUser, { AddUserHandle } from "./AddUser";
import { createRef } from "react";
import { Role } from "@/types/managed-user";

describe("AddUser", () => {
  const mockRoles: Role[] = [
    { id: 1, name: "ROLE_ADMIN" },
    { id: 2, name: "ROLE_USER" },
  ];

  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders add user form in add mode", () => {
    render(
      <AddUser
        onSubmit={mockOnSubmit}
        availableRoles={mockRoles}
        mode="add"
      />
    );

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/roles/i)).toBeInTheDocument();
  });

  it("renders edit user form in edit mode", () => {
    render(
      <AddUser
        onSubmit={mockOnSubmit}
        availableRoles={mockRoles}
        mode="edit"
      />
    );

    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByText(/leave blank to keep current/i)).toBeInTheDocument();
  });

  it("shows validation errors when submitting empty form", async () => {
    const ref = createRef<AddUserHandle>();
    render(
      <AddUser
        ref={ref}
        onSubmit={mockOnSubmit}
        availableRoles={mockRoles}
        mode="add"
      />
    );

    // Try to submit without filling anything - this will trigger validation
    ref.current?.submit();

    // Should show at least one validation error (there will be multiple)
    await waitFor(() => {
      const alerts = screen.queryAllByRole("alert");
      expect(alerts.length).toBeGreaterThan(0);
    });
  });

  it("shows validation error for short username", async () => {
    const user = userEvent.setup();
    const ref = createRef<AddUserHandle>();
    render(
      <AddUser
        ref={ref}
        onSubmit={mockOnSubmit}
        availableRoles={mockRoles}
        mode="add"
      />
    );

    const usernameInput = screen.getByLabelText(/username/i);
    await user.type(usernameInput, "ab");
    
    // Submit to trigger validation
    ref.current?.submit();

    await waitFor(() => {
      expect(screen.getByText(/username must contain at least 3 characters/i)).toBeInTheDocument();
    });
  });

  it("shows validation error for invalid email", async () => {
    const user = userEvent.setup();
    const ref = createRef<AddUserHandle>();
    render(
      <AddUser
        ref={ref}
        onSubmit={mockOnSubmit}
        availableRoles={mockRoles}
        mode="add"
      />
    );

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, "invalid-email");
    
    // Submit to trigger validation
    ref.current?.submit();

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });
  });

  it("shows validation error for short password", async () => {
    const user = userEvent.setup();
    const ref = createRef<AddUserHandle>();
    render(
      <AddUser
        ref={ref}
        onSubmit={mockOnSubmit}
        availableRoles={mockRoles}
        mode="add"
      />
    );

    const passwordInput = screen.getByLabelText(/password/i);
    await user.type(passwordInput, "12345");
    
    // Submit to trigger validation
    ref.current?.submit();

    await waitFor(() => {
      expect(screen.getByText(/password must contain at least 6 characters/i)).toBeInTheDocument();
    });
  });

  it("disables inputs when submitting", () => {
    render(
      <AddUser
        onSubmit={mockOnSubmit}
        availableRoles={mockRoles}
        mode="add"
        isSubmitting={true}
      />
    );

    expect(screen.getByLabelText(/username/i)).toBeDisabled();
    expect(screen.getByLabelText(/email/i)).toBeDisabled();
    expect(screen.getByLabelText(/password/i)).toBeDisabled();
  });

  it("displays submit error message", () => {
    render(
      <AddUser
        onSubmit={mockOnSubmit}
        availableRoles={mockRoles}
        mode="add"
        submitError="Failed to create user"
      />
    );

    expect(screen.getByText(/failed to create user/i)).toBeInTheDocument();
  });

  it("populates form with initial values in edit mode", () => {
    const initialValues = {
      username: "testuser",
      email: "test@example.com",
      roles: [{ id: 1, name: "ROLE_ADMIN" }],
    };

    render(
      <AddUser
        onSubmit={mockOnSubmit}
        availableRoles={mockRoles}
        mode="edit"
        initialValues={initialValues}
      />
    );

    expect(screen.getByLabelText(/username/i)).toHaveValue("testuser");
    expect(screen.getByLabelText(/email/i)).toHaveValue("test@example.com");
  });

  it("exposes submit method via ref", () => {
    const ref = createRef<AddUserHandle>();
    render(
      <AddUser
        ref={ref}
        onSubmit={mockOnSubmit}
        availableRoles={mockRoles}
        mode="add"
      />
    );

    expect(ref.current).toBeTruthy();
    expect(typeof ref.current?.submit).toBe("function");
  });

  it("exposes reset method via ref", () => {
    const ref = createRef<AddUserHandle>();
    render(
      <AddUser
        ref={ref}
        onSubmit={mockOnSubmit}
        availableRoles={mockRoles}
        mode="add"
      />
    );

    expect(ref.current).toBeTruthy();
    expect(typeof ref.current?.reset).toBe("function");
  });

  it("resets form when initialValues change", async () => {
    const { rerender } = render(
      <AddUser
        onSubmit={mockOnSubmit}
        availableRoles={mockRoles}
        mode="edit"
        initialValues={{
          username: "user1",
          email: "user1@example.com",
          roles: [],
        }}
      />
    );

    expect(screen.getByLabelText(/username/i)).toHaveValue("user1");

    rerender(
      <AddUser
        onSubmit={mockOnSubmit}
        availableRoles={mockRoles}
        mode="edit"
        initialValues={{
          username: "user2",
          email: "user2@example.com",
          roles: [],
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toHaveValue("user2");
    });
  });

  it("allows empty password in edit mode", async () => {
    const user = userEvent.setup();
    render(
      <AddUser
        onSubmit={mockOnSubmit}
        availableRoles={mockRoles}
        mode="edit"
        initialValues={{
          username: "testuser",
          email: "test@example.com",
          roles: [{ id: 1, name: "ROLE_ADMIN" }],
        }}
      />
    );

    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveValue("");
    
    // Empty password should not trigger validation error in edit mode
    await user.tab();
    
    // No password error should appear
    expect(screen.queryByText(/password must contain at least 6 characters/i)).not.toBeInTheDocument();
  });
});
