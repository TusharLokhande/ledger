import { useEffect } from "react";
import { useDensityStore } from "@/store/densityStore";

/** Exposes the density as data-density on <html>; index.css keys table spacing off it. */
export function useAppliedDensity() {
  const density = useDensityStore((s) => s.density);

  useEffect(() => {
    document.documentElement.dataset.density = density;
  }, [density]);
}
