import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("utils", () => {
  describe("cn (classnames utility)", () => {
    it("merges class names", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
    });

    it("handles conditional classes", () => {
      const condition = false;
      expect(cn("foo", condition && "bar", "baz")).toBe("foo baz");
    });

    it("handles undefined and null", () => {
      expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
    });

    it("handles empty strings", () => {
      expect(cn("foo", "", "bar")).toBe("foo bar");
    });

    it("merges Tailwind classes correctly", () => {
      const result = cn("px-2 py-1", "px-4");
      // Should override px-2 with px-4
      expect(result).toContain("px-4");
      expect(result).toContain("py-1");
    });

    it("handles arrays", () => {
      expect(cn(["foo", "bar"], "baz")).toBe("foo bar baz");
    });

    it("handles objects", () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
    });
  });
});
