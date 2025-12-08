import { fetcher } from "@/lib/swr";
import { Listing } from "@/lib/types";
import useSWR from "swr";

export function useListings() {
  return useSWR<Listing[]>(`/api/listings`, fetcher);
}
