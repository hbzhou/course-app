import Logo from "@/layout/Logo";
import Profile from "@/layout/Profile";
import Nav from "@/layout/Nav";
import NotificationBell from "@/layout/NotificationBell";
import { AuthenticatedOnly } from "@/common/AuthenticatedOnly";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-fade">
      <div className="container mx-auto flex justify-between items-center h-16 px-4">
        <div className="flex items-center gap-6">
          <Logo />
          <AuthenticatedOnly>
            <Nav />
          </AuthenticatedOnly>
        </div>
        <div className="flex items-center gap-4">
          <AuthenticatedOnly>
            <NotificationBell />
            <Profile />
          </AuthenticatedOnly>
        </div>
      </div>
    </header>
  );
};

export default Header;
