import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PermissionRoute from "../PermissionRoute";
import { usePermission } from "@/hooks/usePermission";

vi.mock("@/hooks/usePermission", () => ({
  usePermission: vi.fn(),
}));

vi.mock("@/common/AccessDenied", () => ({
  default: () => <div>Access Denied Page</div>,
}));

describe("PermissionRoute", () => {
  it("renders children when user has permission", () => {
    vi.mocked(usePermission).mockReturnValue(true);

    render(
      <MemoryRouter>
        <PermissionRoute required="COURSE_EDIT" deny="403">
          <div>Protected Content</div>
        </PermissionRoute>
      </MemoryRouter>
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("renders AccessDenied when user lacks permission and deny=403", () => {
    vi.mocked(usePermission).mockReturnValue(false);

    render(
      <MemoryRouter>
        <PermissionRoute required="COURSE_EDIT" deny="403">
          <div>Protected Content</div>
        </PermissionRoute>
      </MemoryRouter>
    );

    expect(screen.getByText("Access Denied Page")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("redirects to /courses when user lacks permission and deny=redirect", () => {
    vi.mocked(usePermission).mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={["/courses/add"]}>
        <Routes>
          <Route
            path="/courses/add"
            element={
              <PermissionRoute required="COURSE_EDIT" deny="redirect">
                <div>Create Course</div>
              </PermissionRoute>
            }
          />
          <Route path="/courses" element={<div>Courses Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Courses Page")).toBeInTheDocument();
    expect(screen.queryByText("Create Course")).not.toBeInTheDocument();
  });
});
