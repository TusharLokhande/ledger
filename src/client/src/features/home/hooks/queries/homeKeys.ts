import type { HomeRequest } from "@/features/home/types/home.types";

export const homeKeys = {
  all: ["home"] as const,
  get: (request: HomeRequest) => [...homeKeys.all, request] as const,
};
