import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PrivacyState {
  hideIncome: boolean;
  toggleHideIncome: () => void;
}

/** One switch for every screen that shows income amounts. */
export const usePrivacyStore = create<PrivacyState>()(
  persist(
    (set) => ({
      hideIncome: false,
      toggleHideIncome: () => set((s) => ({ hideIncome: !s.hideIncome })),
    }),
    { name: "privacy" },
  ),
);

export const HIDDEN_AMOUNT = "••••••";
