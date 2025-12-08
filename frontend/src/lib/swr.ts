import { useAppStore } from "@/lib/hooks/useAppStore";

export const fetcher = (...args: Parameters<typeof fetch>) =>
  fetch(...args).then((res) => res.json());
export const loggedInFetcher = (...args: Parameters<typeof fetch>) =>
  fetch(args[0], {
    ...args[1],
    headers: {
      ...(args[1]?.headers || {}),
      Authorization: `Bearer ` + useAppStore.getState().token,
    },
  }).then((res) => res.json());
