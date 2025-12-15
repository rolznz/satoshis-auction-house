import { loggedInFetcher } from "@/lib/swr";
import { Listing } from "@/lib/types";
import useSWR from "swr";

const fetchSettings = {
  refreshInterval: 10_000, // 10 seconds
};

export function useListing(id: string, claimPreimage?: string) {
  return useSWR<Listing>(
    `/api/listings/${id}?claimPreimage=${claimPreimage}`,
    loggedInFetcher,
    fetchSettings
  );
}
