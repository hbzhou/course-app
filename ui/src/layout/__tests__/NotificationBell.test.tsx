import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import NotificationBell from "../NotificationBell";
import { NotificationProvider } from "@/context/NotificationContext";

describe("NotificationBell", () => {
  const renderNotificationBell = () => {
    return render(
      <NotificationProvider>
        <NotificationBell />
      </NotificationProvider>
    );
  };

  it("renders notification bell button", () => {
    renderNotificationBell();
    expect(screen.getByRole("button", { name: /notifications/i })).toBeInTheDocument();
  });

  it("shows no badge when no unread notifications", () => {
    renderNotificationBell();
    expect(screen.queryByText(/\d+/)).not.toBeInTheDocument();
  });

  it("opens notification panel on click", async () => {
    const user = userEvent.setup();
    renderNotificationBell();
    
    const button = screen.getByRole("button", { name: /notifications/i });
    await user.click(button);
    
    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });

  it("shows empty state when no notifications", async () => {
    const user = userEvent.setup();
    renderNotificationBell();
    
    const button = screen.getByRole("button", { name: /notifications/i });
    await user.click(button);
    
    expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
  });
});
