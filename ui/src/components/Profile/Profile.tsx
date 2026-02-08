import React from "react";
import { Button } from "@/common/Button";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "@/store/store";
import { useLogout } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { AuthSliceState } from "@/store/auth/auth.slice";
import { LogOut, User } from "lucide-react";

const Profile: React.FC = () => {
  const currentUser = useSelector(selectCurrentUser) as AuthSliceState;
  const logoutMutation = useLogout();
  const navigate = useNavigate();

  const handleOnClick = async () => {
    if (currentUser.token) {
      try {
        await logoutMutation.mutateAsync(currentUser.token);
        navigate("/login");
      } catch (error) {
        // Even if logout fails on server, still navigate to login
        console.error("Logout error:", error);
        navigate("/login");
      }
    }
  };

  if (!currentUser.token) return <span />;
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{currentUser.username}</span>
      </div>
      <Button variant="outline" onClick={handleOnClick} disabled={logoutMutation.isPending}>
        <LogOut className="h-4 w-4 mr-2" />
        {logoutMutation.isPending ? "Logging out..." : "Logout"}
      </Button>
    </div>
  );
};

export default Profile;
