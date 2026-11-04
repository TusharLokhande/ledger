import type { PageRequest } from "@/types/pagination.types";
import type { CategoryFilterRequest } from "@/features/categories/types/category.types";

export const categoryKeys = {
  all: ["categories"] as const,
  search: (request: PageRequest<CategoryFilterRequest>) => [...categoryKeys.all, "search", request] as const,
  options: () => [...categoryKeys.all, "options"] as const,
};
