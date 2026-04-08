import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Label } from "./Label";

describe("Label", () => {
  it("renders label text", () => {
    render(<Label>Username</Label>);
    expect(screen.getByText("Username")).toBeInTheDocument();
  });

  it("applies htmlFor attribute", () => {
    render(<Label htmlFor="username-input">Username</Label>);
    const label = screen.getByText("Username");
    expect(label).toHaveAttribute("for", "username-input");
  });

  it("applies custom className", () => {
    render(<Label className="custom-label">Label</Label>);
    expect(screen.getByText("Label")).toHaveClass("custom-label");
  });

  it("renders with children elements", () => {
    render(
      <Label>
        <span>Required</span> Field
      </Label>
    );
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(screen.getByText(/Field/)).toBeInTheDocument();
  });
});
