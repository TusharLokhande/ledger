import type { HomeRequest } from "@/features/home/types/home.types";

export const homeKeys = {
  all: ["home"] as const,
  get: (request: HomeRequest) => [...homeKeys.all, request] as const,
  calendar: (month: string) => [...homeKeys.all, "calendar", month] as const,
};
