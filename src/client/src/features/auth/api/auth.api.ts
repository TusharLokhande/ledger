import { axiosClient, refreshAccessToken } from "@/api/axiosClient";

export async function logout(): Promise<void> {
  await axiosClient.post("/auth/logout");
}

/** Restores a session from the refresh cookie; stores the new access token on success. */
export const restoreSession = refreshAccessToken;

/** Fetches the avatar with the bearer token (an <img src> can't send it) and returns an object URL. */
export async function getAvatar(url: string): Promise<string> {
  const { data } = await axiosClient.get<Blob>(url, { responseType: "blob" });
  return URL.createObjectURL(data);
}
