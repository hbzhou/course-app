import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import AccessDenied from "@/common/AccessDenied";
import { usePermission } from "@/hooks/usePermission";

type PermissionRouteProps = {
  children: ReactNode;
  required: string;
  deny: "403" | "redirect";
};

const PermissionRoute = ({ children, required, deny }: PermissionRouteProps) => {
  const hasPermission = usePermission(required);

  if (!hasPermission) {
    if (deny === "403") {
      return <AccessDenied />;
    }

    return <Navigate to="/courses" replace />;
  }

  return children;
};

export default PermissionRoute;
