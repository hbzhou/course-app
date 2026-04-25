import { useAuthContext } from "@/context/auth-context";

export function usePermission(permission: string): boolean {
  const { user, authStatus } = useAuthContext();

  if (authStatus !== "authenticated" || !user) {
    return false;
  }

  return user.permissions.includes(permission);
}
