import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("renders textarea", () => {
    render(<Textarea placeholder="Enter description" />);
    expect(screen.getByPlaceholderText("Enter description")).toBeInTheDocument();
  });

  it("handles value changes", async () => {
    const user = userEvent.setup();
    render(<Textarea placeholder="Description" />);
    
    const textarea = screen.getByPlaceholderText("Description");
    await user.type(textarea, "Test content");
    
    expect(textarea).toHaveValue("Test content");
  });

  it("applies custom className", () => {
    render(<Textarea className="custom-class" placeholder="Text" />);
    expect(screen.getByPlaceholderText("Text")).toHaveClass("custom-class");
  });

  it("can be disabled", () => {
    render(<Textarea disabled placeholder="Text" />);
    expect(screen.getByPlaceholderText("Text")).toBeDisabled();
  });

  it("supports different rows", () => {
    render(<Textarea rows={10} placeholder="Text" />);
    expect(screen.getByPlaceholderText("Text")).toHaveAttribute("rows", "10");
  });

  it("triggers onChange callback", async () => {
    const user = userEvent.setup();
    let value = "";
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      value = e.target.value;
    };

    render(<Textarea onChange={handleChange} placeholder="Text" />);
    
    await user.type(screen.getByPlaceholderText("Text"), "New");
    
    expect(value).toBe("New");
  });
});
