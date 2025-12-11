import { NostrProfile } from "@/lib/types";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface AppState {
  readonly token: string;
  readonly nostrProfiles: Record<string, NostrProfile>;
  login: (token: string) => void;
  logout: () => void;
  addNostrProfile: (key: string, profile: NostrProfile) => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        nostrProfiles: {},
        token: "",
        login: (token: string) => {
          set({
            token,
          });
        },
        logout: () => {
          set({ token: "" });
        },
        addNostrProfile: (key, profile) => {
          set({
            nostrProfiles: { ...get().nostrProfiles, [key]: profile },
          });
        },
      }),
      {
        name: "satoshis-auction-house-storage",
      }
    )
  )
);
