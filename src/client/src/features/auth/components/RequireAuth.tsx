import { Navigate, Outlet, useLocation } from "react-router-dom";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { useAuthStore } from "@/store/authStore";
import { useRestoreSession } from "@/features/auth/hooks/queries/useRestoreSession";

export function RequireAuth() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();
  const session = useRestoreSession(!isAuthenticated);

  if (isAuthenticated) return <Outlet />;
  if (session.isError) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <FullScreenLoader />;
}
