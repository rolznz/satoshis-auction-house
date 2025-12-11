import { useAppStore } from "@/lib/hooks/useAppStore";
import { getNostrProfile } from "@/lib/nostr";
import React from "react";

export function useNostrProfile(pubkey: string) {
  React.useEffect(() => {
    getNostrProfile(pubkey);
  }, [pubkey]);
  return useAppStore((store) => store.nostrProfiles)[pubkey];
}
