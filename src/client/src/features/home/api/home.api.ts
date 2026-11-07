import { axiosClient } from "@/api/axiosClient";
import type { Home, HomeCalendarDay, HomeCalendarRequest, HomeRequest } from "@/features/home/types/home.types";

export async function getHome(request: HomeRequest): Promise<Home> {
  const { data } = await axiosClient.post<Home>("/home", request);
  return data;
}

export async function getHomeCalendar(request: HomeCalendarRequest): Promise<HomeCalendarDay[]> {
  const { data } = await axiosClient.post<HomeCalendarDay[]>("/home/calendar", request);
  return data;
}
