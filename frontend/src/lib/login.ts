import { toast } from "sonner";

import { useAppStore } from "@/lib/hooks/useAppStore";
import { nip19 } from "nostr-tools";
import type { WindowNostr } from "nostr-tools/nip07";
import { hexToBytes } from "nostr-tools/utils";

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

    // check for a newly-created nostr login account
    const nostrLoginAccountsJSON = localStorage.getItem(
      "__nostrlogin_accounts"
    );
    if (nostrLoginAccountsJSON) {
      const accounts = JSON.parse(nostrLoginAccountsJSON) as [
        { pubkey: string; sk: string; name: string; authMethod: string }
      ];
      if (accounts.length === 1) {
        if (accounts[0].authMethod === "local") {
          prompt(
            "please copy and save your secret key before continuing",
            nip19.nsecEncode(hexToBytes(accounts[0].sk))
          );
        }
      }
    }

    return true;
  } catch (error) {
    console.error(error);
    toast.error("failed to login: " + error);
    return false;
  }
}
