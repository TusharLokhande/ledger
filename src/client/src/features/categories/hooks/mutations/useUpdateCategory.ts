import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCategory } from "@/features/categories/api/categories.api";
import { categoryKeys } from "@/features/categories/hooks/queries/categoryKeys";

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}
