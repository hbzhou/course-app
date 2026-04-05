import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "@/store/store";
import { AuthSliceState } from "@/store/auth/auth.slice";

type ProtectedRouteProps = {
  children: ReactNode;
};

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const location = useLocation();
  const currentUser = useSelector(selectCurrentUser) as AuthSliceState;

  // Token is the app's auth signal today.
  if (!currentUser?.token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;

