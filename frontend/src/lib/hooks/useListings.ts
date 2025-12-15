import { fetcher } from "@/lib/swr";
import { Listing } from "@/lib/types";
import useSWR from "swr";

export function useListings(query?: { past?: boolean; future?: boolean }) {
  const search = new URLSearchParams(
    Object.entries(query || {}).map((entry) => [entry[0], entry[1].toString()])
  );
  return useSWR<Listing[]>(`/api/listings?${search}`, fetcher);
}
