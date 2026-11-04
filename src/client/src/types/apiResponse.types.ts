import type { ErrorStatus } from "./errorStatus.enum";

export interface ApiResponse<T> {
  message: string;
  data: T | null;
  status: ErrorStatus;
  errors: Record<string, string[]> | null;
}
