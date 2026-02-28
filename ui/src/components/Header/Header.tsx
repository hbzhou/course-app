import React from "react";
import Logo from "@/components/Logo/Logo";
import Profile from "@/components/Profile/Profile";
import Nav from "@/components/Navigation/Nav";
import NotificationBell from "@/components/Notifications/NotificationBell";


const Header: React.FC = () => {

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto flex justify-between items-center h-16 px-6">
        <div className="flex items-center gap-6">
          <Logo />
          <Nav />
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <Profile />
        </div>
      </div>
    </header>
  );
};

export default Header;
