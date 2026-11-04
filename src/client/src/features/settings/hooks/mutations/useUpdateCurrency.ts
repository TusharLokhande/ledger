import { useMutation } from "@tanstack/react-query";
import { updateCurrency } from "@/features/settings/api/settings.api";
import { useAuthStore } from "@/store/authStore";

export function useUpdateCurrency() {
  return useMutation({
    mutationFn: updateCurrency,
    onSuccess: (user) => {
      const { accessToken, setAuth } = useAuthStore.getState();
      if (accessToken) setAuth(accessToken, user);
    },
  });
}
