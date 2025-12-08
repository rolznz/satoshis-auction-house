import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface AppState {
  readonly token: string;
  login: (token: string) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        token: "",
        login: (token: string) => {
          set({
            token,
          });
        },
        logout: () => {
          set({ token: "" });
        },
      }),
      {
        name: "satoshis-auction-house-storage",
      }
    )
  )
);
