import { useAppStore } from "@/lib/hooks/useAppStore";
import { SimplePool } from "nostr-tools/pool";

const pool = new SimplePool();

// TODO: we need to use the user's relays rather than a hardcoded list
const relays = ["wss://relay.damus.io", "wss://nos.lol"];

const getPromises: Record<string, Promise<void>> = {};

export async function getNostrProfile(pubkey: string) {
  const profile = useAppStore.getState().nostrProfiles[pubkey];
  if (profile) {
    return profile;
  }
  const existingPromise = getPromises[pubkey];
  if (existingPromise) {
    return existingPromise;
  }
  console.log("Doing actual GET for pubkey", pubkey);
  getPromises[pubkey] = (async () => {
    // let's query for one event that exists
    try {
      const event = await pool.get(relays, {
        authors: [pubkey],
        kinds: [0],
        limit: 1,
      });
      if (event) {
        const profile = JSON.parse(event.content);
        useAppStore.getState().addNostrProfile(pubkey, profile);
      }
    } catch (error) {
      console.error("failed to fetch profile from pool", error);
    }
    delete getPromises[pubkey];
  })();
}
