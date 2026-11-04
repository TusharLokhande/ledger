import { axiosClient } from "@/api/axiosClient";
import type { PagedResult, PageRequest } from "@/types/pagination.types";
import type { AccountDto, AccountFilterRequest, AccountFormValues, AccountOption } from "@/features/accounts/types/account.types";

export async function searchAccounts(request: PageRequest<AccountFilterRequest>): Promise<PagedResult<AccountDto>> {
  const { data } = await axiosClient.post<PagedResult<AccountDto>>("/accounts/search", request);
  return data;
}

export async function createAccount(payload: AccountFormValues): Promise<AccountDto> {
  const { data } = await axiosClient.post<AccountDto>("/accounts", payload);
  return data;
}

export async function updateAccount({ id, ...payload }: AccountFormValues & { id: string }): Promise<AccountDto> {
  const { data } = await axiosClient.put<AccountDto>(`/accounts/${id}`, payload);
  return data;
}

export async function archiveAccount(id: string): Promise<AccountDto> {
  const { data } = await axiosClient.post<AccountDto>(`/accounts/${id}/archive`);
  return data;
}

export async function restoreAccount(id: string): Promise<AccountDto> {
  const { data } = await axiosClient.post<AccountDto>(`/accounts/${id}/restore`);
  return data;
}

export async function deleteAccount(id: string): Promise<void> {
  await axiosClient.delete(`/accounts/${id}`);
}

export async function getAccountOptions(): Promise<AccountOption[]> {
  const { data } = await axiosClient.get<AccountOption[]>("/accounts/options");
  return data;
}
