import { fetcher } from "@/lib/swr";
import useSWR from "swr";

export function useBitcoinRate(currency: string): number | undefined {
  const url =
    "https://getalby.com/api/rates/" + currency.toLowerCase() + ".json";
  const { data: rate } = useSWR<{ rate_float: number }>(url, fetcher);

  if (!rate) {
    return undefined;
  }

  return rate.rate_float;
}
