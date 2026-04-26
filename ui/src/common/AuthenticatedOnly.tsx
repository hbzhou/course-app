import { ReactNode } from 'react';
import { useAuthContext } from '@/context/auth-context';

interface AuthenticatedOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const AuthenticatedOnly = ({ children, fallback = null }: AuthenticatedOnlyProps) => {
  const { isAuthenticated } = useAuthContext();

  return isAuthenticated ? children : fallback;
};

export default AuthenticatedOnly;
