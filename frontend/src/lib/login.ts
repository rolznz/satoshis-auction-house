import { toast } from "sonner";

import { useAppStore } from "@/lib/hooks/useAppStore";
import type { WindowNostr } from "nostr-tools/nip07";

declare global {
  interface Window {
    nostr?: WindowNostr;
  }
}

export async function login() {
  try {
    if (!window.nostr) {
      throw new Error("No Nostr provider");
    }

    // https://github.com/nostr-protocol/nips/blob/master/98.md
    const event = await window.nostr.signEvent({
      kind: 27235,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["u", window.location.origin + "/api/users/login"],
        ["method", "POST"],
      ],
      content: "",
    });

    const response = await fetch("/api/users/login", {
      method: "POST",
      body: JSON.stringify(event),
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error("Failed to request login: " + (await response.text()));
    }
    const { token } = await response.json();
    useAppStore.getState().login(token);
    toast("Logged in successfully");
    return true;
  } catch (error) {
    console.error(error);
    toast.error("failed to login: " + error);
    return false;
  }
}
