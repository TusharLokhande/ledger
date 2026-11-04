import { useEffect } from "react";
import { useThemeStore } from "@/store/themeStore";

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function useAppliedTheme() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const isDark = theme === "system" ? systemPrefersDark() : theme === "dark";
      root.classList.toggle("dark", isDark);
    };

    apply();

    if (theme !== "system") return;

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, [theme]);
}
