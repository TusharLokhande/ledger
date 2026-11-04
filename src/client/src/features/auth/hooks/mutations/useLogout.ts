import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { logout } from "@/features/auth/api/auth.api";
import { useAuthStore } from "@/store/authStore";

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: logout,
    // Sign out locally even if the server call fails.
    onSettled: () => {
      clearAuth();
      queryClient.clear();
      navigate("/login", { replace: true });
    },
  });
}
