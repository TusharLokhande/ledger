import { axiosClient } from "@/api/axiosClient";
import type { AuthUser } from "@/types/auth.types";
import type { UpdateCurrencyRequest } from "@/features/settings/types/settings.types";

export async function updateCurrency(payload: UpdateCurrencyRequest): Promise<AuthUser> {
  const { data } = await axiosClient.put<AuthUser>("/profile/currency", payload);
  return data;
}
