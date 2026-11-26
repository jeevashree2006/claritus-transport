/**
 * All routes. Module routes are generated from config/menu.js -
 * don't add module routes by hand here.
 */
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { Loader } from '../components/ui-kit';
import { MENU } from '../config/menu';
import { getHomePath } from '../config/roles';
import { useAuth } from '../context/AuthContext';
import LoginPage from '../modules/auth/LoginPage';
import { ProtectedRoute } from './ProtectedRoute';

/** Sends a signed-in user to their role's home page. */
function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={getHomePath(user?.role)} replace />;
}

/** The login page is only for signed-out users. */
function PublicOnlyRoute({ children }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Loader fullScreen label="Checking your session" />;
  if (user) return <Navigate to={getHomePath(user.role)} replace />;
  return children;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />

      {/* Everything below needs a signed-in user and uses the app layout. */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<HomeRedirect />} />

          {MENU.map(({ key, path, roles, component: Page }) => (
            <Route
              key={key}
              path={path.replace(/^\//, '')}
              element={
                <ProtectedRoute allowedRoles={roles}>
                  <Page />
                </ProtectedRoute>
              }
            />
          ))}

          {/* Unknown address -> the role's home page */}
          <Route path="*" element={<HomeRedirect />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default AppRoutes;
