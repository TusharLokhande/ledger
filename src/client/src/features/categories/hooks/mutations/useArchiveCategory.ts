import { useMutation, useQueryClient } from "@tanstack/react-query";
import { archiveCategory } from "@/features/categories/api/categories.api";
import { categoryKeys } from "@/features/categories/hooks/queries/categoryKeys";

export function useArchiveCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: archiveCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}
