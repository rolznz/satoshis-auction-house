import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/hooks/useAppStore";
import { useListing } from "@/lib/hooks/useListing";
import { login } from "@/lib/login";
import { launchPaymentModal } from "@getalby/bitcoin-connect-react";
import { SendPaymentResponse } from "@webbtc/webln-types";
import { Loader2Icon } from "lucide-react";
import { nip19 } from "nostr-tools";
import React from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

export function ListingPage() {
  const token = useAppStore((store) => store.token);
  const { id } = useParams() as { id: string };
  const { data: listing } = useListing(id);
  const [bidAmount, setBidAmount] = React.useState("");
  const [bidDrawerOpen, setBidDrawerOpen] = React.useState(false);
  const [creatingBid, setCreatingBid] = React.useState(false);
  const [bidId, setBidId] = React.useState("");
  const [setPaidFunction, setSetPaidFunction] =
    React.useState<(sendPaymentResponse: SendPaymentResponse) => void>();

  React.useEffect(() => {
    if (bidId && listing?.bids.some((bid) => bid.id === bidId)) {
      toast("Bid placed successfully.");
      setBidId("");
      setPaidFunction?.({ preimage: "dummy" });
      setBidDrawerOpen(false);
    }
  }, [bidId, listing, setPaidFunction]);

  if (!listing) {
    return null;
  }

  async function createBid(e: React.FormEvent) {
    e.preventDefault();
    setCreatingBid(true);
    try {
      const response = await fetch(`/api/listings/${id}/bids`, {
        method: "POST",
        body: JSON.stringify({
          amount: parseInt(bidAmount),
        }),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const { invoice, id: bidId } = await response.json();
      setBidId(bidId);
      setBidDrawerOpen(false);
      const { setPaid } = launchPaymentModal({
        invoice,
      });
      setSetPaidFunction(() => setPaid);
      const shownHOLDInvoiceWarning = localStorage.getItem(
        "shown_hold_invoice_warning"
      );
      if (!shownHOLDInvoiceWarning) {
        alert(
          "This is a HOLD invoice. Pay it with your wallet and then return to this page and wait for your bid to be updated."
        );
        localStorage.setItem("shown_hold_invoice_warning", "true");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to create bid: ", {
        description: "" + error,
      });
    }
    setCreatingBid(false);
  }

  const endsInMinutes = listing.endsInMinutes;

  return (
    <div className="p-4">
      <Card className="">
        <CardContent>
          <img
            src={listing.imageUrl || "/icon.svg"}
            className="w-64 h-64 object-cover"
          />
        </CardContent>
        <CardHeader>
          <CardTitle>{listing.title}</CardTitle>
          <CardDescription>
            {listing.description || "No description provided"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-between items-center">
          <CardDescription>
            <span className="font-mono">{listing.currentPrice}</span> sats
          </CardDescription>
          <CardDescription>
            <span className="font-mono">{listing.bids.length}</span> bids
          </CardDescription>
        </CardContent>
        {listing.endsAt && listing.endsAt > Date.now() && !listing.endedAt && (
          <CardContent className="flex justify-center">
            {!!endsInMinutes && (
              <p className="font-semibold text-xs">
                {endsInMinutes > 2 ? (
                  <>
                    Ends in {listing.endsAtBlock && "~"}
                    {endsInMinutes} minutes{" "}
                    {listing.endsAtBlock && (
                      <span>
                        at{" "}
                        <a
                          href="https://mempool.space"
                          target="_blank"
                          className="underline"
                        >
                          block {listing.endsAtBlock}
                        </a>
                      </span>
                    )}
                  </>
                ) : endsInMinutes > 1 ? (
                  <span className="text-destructive">
                    Ends in less than 2 minutes!
                  </span>
                ) : (
                  <>
                    <span className="text-destructive animate-pulse">
                      Ends in less than 1 minute!
                    </span>
                  </>
                )}
              </p>
            )}
          </CardContent>
        )}
        <CardFooter>
          <Drawer
            open={bidDrawerOpen}
            onOpenChange={() => {
              setBidDrawerOpen(false);
            }}
          >
            {!listing.endedAt &&
              (!listing.endsAt || listing.endsAt > Date.now()) && (
                <Button
                  className="w-full"
                  onClick={async () => {
                    if (!token) {
                      const loginResult = await login();
                      if (!loginResult) {
                        return;
                      }
                    }
                    setBidDrawerOpen(true);
                    setBidAmount((listing.currentPrice + 1).toString());
                  }}
                >
                  Bid Now
                </Button>
              )}
            {(listing.endedAt ||
              (listing.endsAt && listing.endsAt < Date.now())) && (
              <div>
                <Button disabled>Auction Ended</Button>
                {listing.winnerPubkey && (
                  <>
                    <p className="break-all">
                      Winner: {nip19.npubEncode(listing.winnerPubkey)}
                    </p>

                    {listing.pin && (
                      <div className="mt-4">
                        <p>You won!</p>
                        <p>
                          Send this pin {listing.pin} to your counterparty to
                          prove your purchase and co-ordinate delivery.
                        </p>
                        <p className="break-all">
                          Seller npub: {nip19.npubEncode(listing.sellerPubkey)}
                        </p>
                        {listing.sellerContactInfo && (
                          <p>
                            Seller contact info: {listing.sellerContactInfo}
                          </p>
                        )}
                        {listing.winnerPubkey && (
                          <p className="break-all">
                            Winner npub:{" "}
                            {nip19.npubEncode(listing.winnerPubkey)}
                          </p>
                        )}
                        {listing.winnerContactInfo && (
                          <p>
                            Winner contact info: {listing.winnerContactInfo}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            <DrawerContent>
              {!creatingBid && (
                <form onSubmit={createBid}>
                  <div className="mx-auto w-full max-w-sm">
                    <DrawerHeader>
                      <DrawerTitle>Enter Bid</DrawerTitle>
                      <DrawerDescription>
                        Set the amount in sats you'd like to bid
                      </DrawerDescription>
                    </DrawerHeader>
                    <div className="p-4 pb-0">
                      <div className="flex gap-4">
                        {[10, 50, 100].map((value) => (
                          <Button
                            key={value}
                            className="flex-1 w-full h-full aspect-[1/1] text-[150%] font-medium font-mono"
                            type="button"
                            variant="secondary"
                            onClick={() =>
                              setBidAmount(
                                Math.ceil(
                                  parseInt(bidAmount) * (1 + value / 100)
                                ).toString()
                              )
                            }
                          >
                            +{value}%
                          </Button>
                        ))}
                      </div>
                      <div className="flex items-center justify-center space-x-2 mt-4">
                        <div className="flex-1 text-center">
                          <Input
                            type="number"
                            autoFocus
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            className="!text-2xl h-14 font-mono"
                            min={listing.currentPrice + 1}
                          />
                        </div>
                      </div>
                    </div>

                    <DrawerFooter>
                      <Button className="h-14 text-lg font-medium">
                        PLACE BID
                      </Button>
                    </DrawerFooter>
                  </div>
                </form>
              )}
              {creatingBid && (
                <div className="w-full h-32 flex items-center justify-center">
                  <Loader2Icon className="animate-spin" />
                </div>
              )}
            </DrawerContent>
          </Drawer>
        </CardFooter>
      </Card>
    </div>
  );
}
