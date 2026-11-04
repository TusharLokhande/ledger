import { axiosClient } from "@/api/axiosClient";
import type { ImportBatch } from "@/features/imports/types/import.types";

export async function getImports(): Promise<ImportBatch[]> {
  const { data } = await axiosClient.get<ImportBatch[]>("/imports");
  return data;
}

export async function uploadImport(file: File): Promise<ImportBatch> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await axiosClient.post<ImportBatch>("/imports", form);
  return data;
}

export async function downloadTemplate(): Promise<Blob> {
  const { data } = await axiosClient.get<Blob>("/imports/template", { responseType: "blob" });
  return data;
}

export async function downloadErrors(id: string): Promise<Blob> {
  const { data } = await axiosClient.get<Blob>(`/imports/${id}/errors`, { responseType: "blob" });
  return data;
}
