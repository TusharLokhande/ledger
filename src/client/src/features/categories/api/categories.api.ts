import { axiosClient } from "@/api/axiosClient";
import type { PagedResult, PageRequest } from "@/types/pagination.types";
import type { CategoryDto, CategoryFilterRequest, CategoryFormValues, CategoryOption } from "@/features/categories/types/category.types";

export async function searchCategories(request: PageRequest<CategoryFilterRequest>): Promise<PagedResult<CategoryDto>> {
  const { data } = await axiosClient.post<PagedResult<CategoryDto>>("/categories/search", request);
  return data;
}

export async function createCategory(payload: CategoryFormValues): Promise<CategoryDto> {
  const { data } = await axiosClient.post<CategoryDto>("/categories", payload);
  return data;
}

export async function updateCategory({ id, ...payload }: CategoryFormValues & { id: string }): Promise<CategoryDto> {
  const { data } = await axiosClient.put<CategoryDto>(`/categories/${id}`, payload);
  return data;
}

export async function archiveCategory(id: string): Promise<CategoryDto> {
  const { data } = await axiosClient.post<CategoryDto>(`/categories/${id}/archive`);
  return data;
}

export async function restoreCategory(id: string): Promise<CategoryDto> {
  const { data } = await axiosClient.post<CategoryDto>(`/categories/${id}/restore`);
  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  await axiosClient.delete(`/categories/${id}`);
}

export async function getCategoryOptions(): Promise<CategoryOption[]> {
  const { data } = await axiosClient.get<CategoryOption[]>("/categories/options");
  return data;
}
