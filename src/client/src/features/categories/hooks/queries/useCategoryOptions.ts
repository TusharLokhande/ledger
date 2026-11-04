import { useQuery } from "@tanstack/react-query";
import { getCategoryOptions } from "@/features/categories/api/categories.api";
import { categoryKeys } from "@/features/categories/hooks/queries/categoryKeys";

export function useCategoryOptions() {
  return useQuery({ queryKey: categoryKeys.options(), queryFn: getCategoryOptions });
}
