/**
 * Route guard.
 *  - still checking the session  -> full-screen loader
 *  - not signed in               -> /login
 *  - signed in, role not allowed -> the role's home page
 *
 *   <ProtectedRoute />                          any signed-in user (renders <Outlet />)
 *   <ProtectedRoute allowedRoles={['admin']}>  only these roles
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader } from '../components/ui-kit';
import { getHomePath } from '../config/roles';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ allowedRoles, children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Loader fullScreen label="Checking your session" />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getHomePath(user.role)} replace />;
  }

  return children ?? <Outlet />;
}

export default ProtectedRoute;
