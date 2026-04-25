import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/common/button-variants";
import { usePermission } from "@/hooks/usePermission";

const Nav = () => {
  const location = useLocation();
  const isCoursesTabActive = location.pathname === "/" || location.pathname.startsWith("/courses");
  const canManageUsers = usePermission("USER_MANAGE");

  return (
    <nav className="hidden md:flex items-center gap-1">
      <NavLink
        to="/courses"
        className={({ isActive }) =>
          cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-sm transition-colors-fast",
            (isActive || isCoursesTabActive) && "bg-primary/10 text-primary font-medium"
          )
        }
      >
        Courses
      </NavLink>
      <NavLink
        to="/authors"
        className={({ isActive }) =>
          cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-sm transition-colors-fast",
            isActive && "bg-primary/10 text-primary font-medium"
          )
        }
      >
        Authors
      </NavLink>
      <NavLink
        to="/tags"
        className={({ isActive }) =>
          cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-sm transition-colors-fast",
            isActive && "bg-primary/10 text-primary font-medium"
          )
        }
      >
        Tags
      </NavLink>
      {canManageUsers && (
        <NavLink
          to="/users"
          className={({ isActive }) =>
            cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-sm transition-colors-fast",
              isActive && "bg-primary/10 text-primary font-medium"
            )
          }
        >
          Users
        </NavLink>
      )}
    </nav>
  );
};

export default Nav;
