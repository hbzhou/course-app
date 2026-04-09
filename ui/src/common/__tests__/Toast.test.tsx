import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  ToastAction,
} from "../Toast";

describe("Toast components", () => {
  it("exports  all Toast components", () => {
    expect(Toast).toBeDefined();
    expect(ToastProvider).toBeDefined();
    expect(ToastViewport).toBeDefined();
    expect(ToastTitle).toBeDefined();
    expect(ToastDescription).toBeDefined();
    expect(ToastClose).toBeDefined();
    expect(ToastAction).toBeDefined();
  });

  it("renders ToastProvider without errors", () => {
    const { container } = render(
      <ToastProvider>
        <div>Test content</div>
      </ToastProvider>
    );
    expect(container).toBeInTheDocument();
  });

  it("renders ToastViewport without errors", () => {
    const { container } = render(
      <ToastProvider>
        <ToastViewport />
      </ToastProvider>
    );
    expect(container).toBeInTheDocument();
  });

  it("renders Toast with default variant", () => {
    const { container } = render(
      <ToastProvider>
        <Toast open={true}>
          <ToastTitle>Test</ToastTitle>
          <ToastDescription>Description</ToastDescription>
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );
    expect(container).toBeInTheDocument();
  });

  it("renders Toast with destructive variant", () => {
    const { container } = render(
      <ToastProvider>
        <Toast open={true} variant="destructive">
          <ToastTitle>Error</ToastTitle>
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );
    expect(container).toBeInTheDocument();
  });

  it("renders ToastAction without errors", () => {
    const { container } = render(
      <ToastProvider>
        <Toast open={true}>
          <ToastTitle>Test</ToastTitle>
          <ToastAction altText="Undo action">Undo</ToastAction>
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );
    expect(container).toBeInTheDocument();
  });
});
