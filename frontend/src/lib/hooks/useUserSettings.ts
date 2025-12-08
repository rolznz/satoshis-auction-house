import { useAppStore } from "@/lib/hooks/useAppStore";
import { loggedInFetcher } from "@/lib/swr";
import useSWR from "swr";

export type UserSettings = {
  receiveOnlyConnectionSecret?: string;
  contactInfo?: string;
};

export function useUserSettings() {
  const token = useAppStore((store) => store.token);
  return useSWR<UserSettings>(
    token ? "/api/users/settings" : undefined,
    loggedInFetcher
  );
}
