import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AccessDenied from "../AccessDenied";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("AccessDenied", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders 403 heading and message", () => {
    render(
      <MemoryRouter>
        <AccessDenied />
      </MemoryRouter>
    );

    expect(screen.getByText("403")).toBeInTheDocument();
    expect(screen.getByText("Access Denied")).toBeInTheDocument();
  });

  it("shows initial countdown of 5", () => {
    render(
      <MemoryRouter>
        <AccessDenied />
      </MemoryRouter>
    );

    expect(screen.getByText("5", { selector: "span" })).toBeInTheDocument();
  });

  it("decrements countdown every second", () => {
    render(
      <MemoryRouter>
        <AccessDenied />
      </MemoryRouter>
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("4", { selector: "span" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("3", { selector: "span" })).toBeInTheDocument();
  });

  it("navigates to /courses after 5 seconds", () => {
    render(
      <MemoryRouter>
        <AccessDenied />
      </MemoryRouter>
    );

    for (let i = 0; i < 6; i += 1) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }

    expect(mockNavigate).toHaveBeenCalledWith("/courses", { replace: true });
  });

  it("renders a link to /courses for immediate navigation", () => {
    render(
      <MemoryRouter>
        <AccessDenied />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: /Go to Courses/i })).toBeInTheDocument();
  });
});
