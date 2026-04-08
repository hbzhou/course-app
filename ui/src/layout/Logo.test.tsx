import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Logo from "./Logo";

describe("Logo", () => {
  it("renders logo image", () => {
    render(<Logo />);
    const logo = screen.getByAltText(/course app logo/i);
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("src", "/logo.png");
  });

  it("has proper title attribute", () => {
    render(<Logo />);
    const logo = screen.getByTitle("Course App");
    expect(logo).toBeInTheDocument();
  });

  it("has proper container styling", () => {
    const { container } = render(<Logo />);
    const wrapper = container.querySelector(".flex.items-center");
    expect(wrapper).toBeInTheDocument();
  });
});
