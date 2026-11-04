import type { ErrorStatus } from "./errorStatus.enum";

/** Shape of a rejected promise from axiosClient's response interceptor. */
export interface ApiError {
  message: string;
  status: ErrorStatus;
  errors: Record<string, string[]> | null;
}
