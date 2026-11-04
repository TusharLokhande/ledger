import { axiosClient } from "@/api/axiosClient";
import type { Home, HomeRequest } from "@/features/home/types/home.types";

export async function getHome(request: HomeRequest): Promise<Home> {
  const { data } = await axiosClient.post<Home>("/home", request);
  return data;
}
