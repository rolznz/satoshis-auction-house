import { useAppStore } from "@/lib/hooks/useAppStore";
import { getNostrProfile } from "@/lib/nostr";
import { NostrProfile } from "@/lib/types";
import React from "react";

export function useNostrProfile(pubkey: string): NostrProfile | undefined {
  React.useEffect(() => {
    getNostrProfile(pubkey);
  }, [pubkey]);
  return useAppStore((store) => store.nostrProfiles)[pubkey];
}
