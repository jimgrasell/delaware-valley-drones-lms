import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  /**
   * Optional: restrict to a specific role. If set, authenticated users
   * who don't have this role get bounced home (not to /login). Used for
   * future admin-only routes.
   */
  requireRole?: 'admin' | 'instructor' | 'student';
}

/**
 * Wrap a route element to require authentication. If the user isn't
 * logged in, redirect to /login and remember where they were trying to
 * go via location.state.from — LoginPage reads that on success and
 * bounces them back to the original destination.
 */
function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const user = useAuthStore((s) => s.user);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireRole && user?.role !== requireRole) {
    // Logged in but wrong role — send home rather than bouncing to
    // login again, which would be confusing.
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
