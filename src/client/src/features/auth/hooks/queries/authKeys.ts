export const authKeys = {
  all: ["auth"] as const,
  session: () => [...authKeys.all, "session"] as const,
  avatar: (url: string) => [...authKeys.all, "avatar", url] as const,
};
