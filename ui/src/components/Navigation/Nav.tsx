import React from "react";
import {NavLink, useLocation} from "react-router-dom";
import {cn} from "@/lib/utils";
import { buttonVariants } from "@/common/button-variants";

const Nav: React.FC = () => {
    const location = useLocation();
    const isCoursesTabActive =
        location.pathname === "/" || location.pathname.startsWith("/courses");

    return (
        <nav className="hidden md:flex items-center gap-4">
            <NavLink
                to="/courses"
                className={({ isActive }) =>
                    cn(
                        buttonVariants({ variant: "ghost", size: "sm" }),
                        "text-sm",
                        (isActive || isCoursesTabActive) &&
                        "bg-accent text-accent-foreground"
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
                        "text-sm",
                        isActive && "bg-accent text-accent-foreground"
                    )
                }
            >
                Authors
            </NavLink>
            <NavLink
                to="/users"
                className={({ isActive }) =>
                    cn(
                        buttonVariants({ variant: "ghost", size: "sm" }),
                        "text-sm",
                        isActive && "bg-accent text-accent-foreground"
                    )
                }
            >
                Users
            </NavLink>
        </nav>

    );
}

export default Nav;