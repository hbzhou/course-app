import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Nav from "../Nav";
import { usePermission } from "@/hooks/usePermission";

vi.mock("@/hooks/usePermission", () => ({
  usePermission: vi.fn(),
}));

describe("Nav", () => {
  beforeEach(() => {
    vi.mocked(usePermission).mockReturnValue(true);
  });

  const renderNav = (initialRoute = "/") => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Nav />
      </MemoryRouter>
    );
  };

  it("renders navigation links", () => {
    renderNav();
    
    expect(screen.getByRole("link", { name: /courses/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /authors/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /tags/i })).toBeInTheDocument();
  });

  it("highlights active Courses link", () => {
    renderNav("/courses");
    const coursesLink = screen.getByRole("link", { name: /courses/i });
    expect(coursesLink).toHaveClass("bg-primary/10");
    expect(coursesLink).toHaveClass("text-primary");
  });

  it("highlights active Authors link", () => {
    renderNav("/authors");
    const authorsLink = screen.getByRole("link", { name: /authors/i });
    expect(authorsLink).toHaveClass("bg-primary/10");
    expect(authorsLink).toHaveClass("text-primary");
  });

  it("highlights active Tags link", () => {
    renderNav("/tags");
    const tagsLink = screen.getByRole("link", { name: /tags/i });
    expect(tagsLink).toHaveClass("bg-primary/10");
    expect(tagsLink).toHaveClass("text-primary");
  });

  it("treats root path as Courses active", () => {
    renderNav("/");
    const coursesLink = screen.getByRole("link", { name: /courses/i });
    expect(coursesLink).toHaveClass("bg-primary/10");
  });

  it("has proper navigation structure", () => {
    const { container } = renderNav();
    const nav = container.querySelector("nav");
    expect(nav).toHaveClass("hidden");
    expect(nav).toHaveClass("md:flex");
  });
});
