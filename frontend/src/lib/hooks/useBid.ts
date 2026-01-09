import { loggedInFetcher } from "@/lib/swr";
import { Bid } from "@/lib/types";
import useSWR from "swr";

const fetchSettings = {
  refreshInterval: 3_000, // poll every 3 seconds
};

export function useBid(id: string | undefined) {
  return useSWR<Bid>(
    id ? `/api/bids/${id}` : undefined,
    loggedInFetcher,
    fetchSettings
  );
}
