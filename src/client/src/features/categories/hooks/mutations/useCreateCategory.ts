import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCategory } from "@/features/categories/api/categories.api";
import { categoryKeys } from "@/features/categories/hooks/queries/categoryKeys";

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}
