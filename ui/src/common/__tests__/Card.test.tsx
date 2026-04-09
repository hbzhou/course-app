import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../Card";

describe("Card Components", () => {
  describe("Card", () => {
    it("renders children", () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText("Card content")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(<Card className="custom-class">Content</Card>);
      const card = screen.getByText("Content").closest("div");
      expect(card).toHaveClass("custom-class");
    });
  });

  describe("CardHeader", () => {
    it("renders children", () => {
      render(<CardHeader>Header content</CardHeader>);
      expect(screen.getByText("Header content")).toBeInTheDocument();
    });
  });

  describe("CardTitle", () => {
    it("renders as h3 by default", () => {
      render(<CardTitle>Title</CardTitle>);
      const title = screen.getByText("Title");
      expect(title.tagName).toBe("H3");
    });
  });

  describe("CardDescription", () => {
    it("renders description", () => {
      render(<CardDescription>Description text</CardDescription>);
      expect(screen.getByText("Description text")).toBeInTheDocument();
    });
  });

  describe("CardContent", () => {
    it("renders content", () => {
      render(<CardContent>Content text</CardContent>);
      expect(screen.getByText("Content text")).toBeInTheDocument();
    });
  });

  describe("CardFooter", () => {
    it("renders footer", () => {
      render(<CardFooter>Footer text</CardFooter>);
      expect(screen.getByText("Footer text")).toBeInTheDocument();
    });
  });

  describe("Full Card composition", () => {
    it("renders complete card structure", () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
            <CardDescription>Test Description</CardDescription>
          </CardHeader>
          <CardContent>Test Content</CardContent>
          <CardFooter>Test Footer</CardFooter>
        </Card>
      );

      expect(screen.getByText("Test Title")).toBeInTheDocument();
      expect(screen.getByText("Test Description")).toBeInTheDocument();
      expect(screen.getByText("Test Content")).toBeInTheDocument();
      expect(screen.getByText("Test Footer")).toBeInTheDocument();
    });
  });
});
