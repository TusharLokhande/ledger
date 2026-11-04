import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCategory } from "@/features/categories/api/categories.api";
import { categoryKeys } from "@/features/categories/hooks/queries/categoryKeys";

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}
