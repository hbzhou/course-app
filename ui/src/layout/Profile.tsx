import { Button } from "@/common/Button";
import { useAuthContext } from "@/context/auth-context";
import { useLogout } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { LogOut, User } from "lucide-react";

const Profile = () => {
  const { currentUser, token } = useAuthContext();
  const logoutMutation = useLogout();
  const navigate = useNavigate();

  const handleOnClick = async () => {
    if (token) {
      try {
        await logoutMutation.mutateAsync(token);
        navigate("/login");
      } catch (error) {
        // Even if logout fails on server, still navigate to login
        console.error("Logout error:", error);
        navigate("/login");
      }
    }
  };

  if (!token) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium line-clamp-1">{currentUser?.username}</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOnClick}
        disabled={logoutMutation.isPending}
        className="gap-2 transition-colors-fast"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">{logoutMutation.isPending ? "Logging out..." : "Logout"}</span>
      </Button>
    </div>
  );
};

export default Profile;
