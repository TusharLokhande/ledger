import { useMutation, useQueryClient } from "@tanstack/react-query";
import { restoreCategory } from "@/features/categories/api/categories.api";
import { categoryKeys } from "@/features/categories/hooks/queries/categoryKeys";

export function useRestoreCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: restoreCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}
