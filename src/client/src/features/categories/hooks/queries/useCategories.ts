import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { PageRequest } from "@/types/pagination.types";
import { searchCategories } from "@/features/categories/api/categories.api";
import { categoryKeys } from "@/features/categories/hooks/queries/categoryKeys";
import type { CategoryFilterRequest } from "@/features/categories/types/category.types";

export function useCategories(request: PageRequest<CategoryFilterRequest>) {
  return useQuery({
    queryKey: categoryKeys.search(request),
    queryFn: () => searchCategories(request),
    placeholderData: keepPreviousData,
  });
}
