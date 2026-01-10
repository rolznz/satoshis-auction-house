import FormattedFiatAmount from "@/components/FormattedFiatAmount";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { useAppStore } from "@/lib/hooks/useAppStore";
import { useBid } from "@/lib/hooks/useBid";
import { useListing } from "@/lib/hooks/useListing";
import { useNostrProfile } from "@/lib/hooks/useNostrProfile";
import { login } from "@/lib/login";
import { Bid, Listing } from "@/lib/types";
import { cn } from "@/lib/utils";
import { closeModal, launchPaymentModal } from "@getalby/bitcoin-connect-react";
import { SendPaymentResponse } from "@webbtc/webln-types";
import { formatDistance } from "date-fns";
import {
  AlertTriangleIcon,
  Loader2Icon,
  PlusIcon,
  ZapIcon,
} from "lucide-react";
import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  nip19,
} from "nostr-tools";
import { QRCodeSVG } from "qrcode.react";
import React from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

export function ListingPage() {
  const { id } = useParams() as { id: string };
  const [claimPreimage, setClaimPreimage] = React.useState("");
  const { data: listing } = useListing(id, claimPreimage);
  if (!listing) {
    return null;
  }
  return (
    <ListingPageInternal
      listing={listing}
      setClaimPreimage={setClaimPreimage}
    />
  );
}
export function ListingPageInternal({
  listing,
  slideshow,
  setClaimPreimage,
}: {
  listing: Listing;
  slideshow?: boolean;
  setClaimPreimage?: (preimage: string) => void;
}) {
  const token = useAppStore((store) => store.token);

  const [bidAmount, setBidAmount] = React.useState("");
  const [bidComment, setBidComment] = React.useState("");
  const [bidDrawerOpen, setBidDrawerOpen] = React.useState(false);
  const [creatingBid, setCreatingBid] = React.useState(false);
  const [placedBidId, setPlacedBidId] = React.useState("");
  const [lastBidId, setLastBidId] = React.useState(
    localStorage.getItem("last_bid_" + listing.id) || ""
  );
  const { data: placedBid } = useBid(placedBidId);
  const [setPaidFunction, setSetPaidFunction] =
    React.useState<(sendPaymentResponse: SendPaymentResponse) => void>();

  React.useEffect(() => {
    if (placedBid && placedBid.paid) {
      toast("Bid placed successfully.");
      setPlacedBidId("");
      setPaidFunction?.({ preimage: "dummy" });
      setBidDrawerOpen(false);
    }
    if (placedBid && placedBid.errorMessage) {
      toast.error("Failed to place bid", {
        description: placedBid.errorMessage,
        duration: 600_000,
        dismissible: true,
        closeButton: true,
      });
      setPlacedBidId("");
      setBidDrawerOpen(false);
      closeModal();
    }
  }, [placedBidId, listing, setPaidFunction, placedBid]);

  React.useEffect(() => {
    if (!listing || listing.endedAt) {
      return;
    }
    const newBidId = listing.bids[0]?.id;
    if (newBidId && newBidId !== lastBidId) {
      localStorage.setItem("last_bid_" + listing.id, newBidId);
      toast("New bid!", {
        description: listing.bids[0].amount + " sats",
      });
      setLastBidId(newBidId);
    }
  }, [lastBidId, listing]);

  const sellerNostrProfile = useNostrProfile(listing?.sellerPubkey);

  async function createBid(e: React.FormEvent) {
    e.preventDefault();
    setCreatingBid(true);
    try {
      const response = await fetch(`/api/listings/${listing.id}/bids`, {
        method: "POST",
        body: JSON.stringify({
          amount: parseInt(bidAmount),
          comment: bidComment,
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
      setPlacedBidId(bidId);
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
    <div className="p-4 flex flex-1 flex-wrap max-lg:flex-col w-full gap-4">
      <Card className={cn("flex-1 rounded-md", slideshow && "pb-0")}>
        <CardContent className="flex items-start justify-between gap-4 flex-wrap">
          <img
            src={listing.imageUrl || "/icon.svg"}
            className="w-full lg:w-64 h-64 object-cover"
          />
          {slideshow && (
            <>
              <a
                href={`${window.origin}/listings/${listing.id}`}
                target="_blank"
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="flex items-center gap-2">
                    <PlusIcon className="size-6 bg-blue-300 p-1 text-white rounded-full" />
                    <span className="font-medium text-sm">
                      Join the auction!
                    </span>
                  </div>
                  <QRCodeSVG
                    value={`${window.origin}/listings/${listing.id}`}
                    className="size-40"
                    level="Q"
                  />
                </div>
              </a>
              {listing.instantBidInvoice && (
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="flex items-center gap-2">
                    <ZapIcon className="size-6 bg-yellow-400 p-1 text-white rounded-full" />
                    <span className="font-medium text-sm">Instant bid</span>
                  </div>
                  <QRCodeSVG
                    value={`lightning:${listing.instantBidInvoice}`}
                    className="size-40"
                    level="L"
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
        <CardHeader>
          <CardTitle>{listing.title}</CardTitle>
          <CardDescription className="whitespace-pre-wrap">
            {listing.description || "No description provided"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-between items-center">
          <CardDescription>
            <div>
              <span className="font-mono text-4xl">{listing.currentPrice}</span>{" "}
              sats
            </div>
            <FormattedFiatAmount amount={listing.currentPrice} />
          </CardDescription>
          <CardDescription>
            <span className="font-mono">{listing.bids.length}</span> bids
          </CardDescription>
        </CardContent>
        <div className="flex-1" />
        {sellerNostrProfile && (
          <Item variant="muted">
            <ItemMedia>
              <Avatar className="size-10">
                <AvatarImage src={sellerNostrProfile.picture} />
                <AvatarFallback>
                  {sellerNostrProfile.name?.substring(0, 2)}
                </AvatarFallback>
              </Avatar>
            </ItemMedia>
            <ItemContent>
              <a
                href={`https://nostr.com/${nip19.npubEncode(
                  listing.sellerPubkey
                )}`}
                target="_blank"
              >
                <ItemTitle>{sellerNostrProfile.name}</ItemTitle>
              </a>
              <ItemDescription>
                {formatDistance(listing.createdAt, new Date(), {
                  addSuffix: true,
                })}
              </ItemDescription>
            </ItemContent>
          </Item>
        )}
        {listing.endsAt && listing.endsAt > Date.now() && !listing.endedAt && (
          <CardContent className="flex justify-center">
            {!!endsInMinutes && (
              <p className="font-semibold text-xs mb-2">
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
        {!slideshow && (
          <CardFooter>
            {!listing.endedAt &&
              listing.startsAt &&
              listing.startsAt > Date.now() && (
                <Button className="w-full" disabled>
                  Auction Starts{" "}
                  {formatDistance(listing.startsAt, Date.now(), {
                    addSuffix: true,
                  })}
                </Button>
              )}
            {!listing.endedAt &&
              (!listing.startsAt || listing.startsAt < Date.now()) &&
              (!listing.endsAt || listing.endsAt > Date.now()) &&
              (token ? (
                <Button
                  className="w-full"
                  onClick={async () => {
                    setBidAmount(listing.nextBidAmount.toString());
                    setBidDrawerOpen(true);
                  }}
                >
                  Bid Now
                </Button>
              ) : (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full">Bid Now</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Login to continue</DialogTitle>
                      <DialogDescription>
                        You're one step away from making your first bid.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4">
                      <DialogClose asChild>
                        <Button
                          className="w-full"
                          onClick={async () => {
                            const secretKey = generateSecretKey();
                            const publicKey = getPublicKey(secretKey);
                            window.nostr = {
                              getPublicKey: () => Promise.resolve(publicKey),
                              signEvent: (event) =>
                                Promise.resolve(
                                  finalizeEvent(event, secretKey)
                                ),
                            };
                            const loginResult = await login();
                            if (!loginResult) {
                              return;
                            }
                            setBidAmount(listing.nextBidAmount.toString());
                            setBidDrawerOpen(true);
                          }}
                        >
                          Bid Anonymously
                        </Button>
                      </DialogClose>
                      <DialogClose asChild>
                        <Button
                          className="w-full"
                          onClick={async () => {
                            const loginResult = await login();
                            if (!loginResult) {
                              return;
                            }
                            setBidAmount(listing.nextBidAmount.toString());
                            setBidDrawerOpen(true);
                          }}
                        >
                          Login / Signup
                        </Button>
                      </DialogClose>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            {(listing.endedAt ||
              (listing.endsAt && listing.endsAt < Date.now())) && (
              <div className="w-full">
                <Button disabled>Auction Ended</Button>
                {listing.winnerPubkey && (
                  <>
                    <p className="break-all">
                      <Winner
                        winnerPubkey={listing.winnerPubkey}
                        bid={listing.bids[0]}
                        hasPin={!!listing.pin}
                        setClaimPreimage={setClaimPreimage}
                      />
                    </p>

                    {listing.pin && (
                      <div className="mt-4">
                        <p className="font-bold">🎉🎉🎉</p>
                        <p className="mt-4">
                          Send this pin:{" "}
                          <span className="font-semibold">{listing.pin}</span>{" "}
                          to your counterparty to prove your purchase and
                          co-ordinate delivery.
                        </p>
                        {!listing.bids[0].settled && (
                          <Item variant="outline" className="w-full mt-4">
                            <AlertTriangleIcon className="size-4" />{" "}
                            <p>
                              Invoice failed to settle. Co-ordinate with your
                              counterparty to settle payment.
                            </p>
                          </Item>
                        )}
                        <Item variant="outline" className="mt-2">
                          <ItemMedia>
                            <Avatar className="size-10">
                              <AvatarImage
                                src={
                                  sellerNostrProfile?.picture ||
                                  "https://github.com/evilrabbit.png"
                                }
                              />
                              <AvatarFallback>
                                {sellerNostrProfile?.name?.substring(0, 2) ||
                                  "??"}
                              </AvatarFallback>
                            </Avatar>
                          </ItemMedia>
                          <ItemContent>
                            <ItemTitle>
                              Seller:{" "}
                              {sellerNostrProfile?.name || "Satoshi Rabbit"}
                            </ItemTitle>
                            <ItemDescription>
                              {nip19.npubEncode(listing.sellerPubkey)}
                              <br />
                              {listing.sellerContactInfo}
                            </ItemDescription>
                          </ItemContent>
                        </Item>

                        <WinnerContactInfo
                          winnerPubkey={listing.winnerPubkey}
                          winnerContactInfo={listing.winnerContactInfo}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            <Dialog
              open={bidDrawerOpen}
              onOpenChange={() => {
                setBidDrawerOpen(false);
              }}
            >
              <DialogContent>
                {!creatingBid && (
                  <form onSubmit={createBid} className="">
                    <DialogHeader>
                      <DialogTitle>Enter Bid</DialogTitle>
                      <DialogDescription>
                        Set the amount in sats you'd like to bid
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-4 mt-4">
                      {[10, 50, 100].map((value) => (
                        <Button
                          key={value}
                          className="flex-1 w-full h-full aspect-[1/1] lg:text-[150%] font-medium font-mono"
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
                          min={listing.nextBidAmount}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-center space-x-2 mt-4">
                      <div className="flex-1 text-center">
                        <Input
                          value={bidComment}
                          onChange={(e) => setBidComment(e.target.value)}
                          placeholder="Enter a comment"
                          maxLength={100}
                        />
                      </div>
                    </div>

                    <DialogFooter className="mt-4">
                      <Button className="h-14 text-lg font-medium">
                        PLACE BID
                      </Button>
                    </DialogFooter>
                  </form>
                )}
                {creatingBid && (
                  <div className="w-full h-32 flex items-center justify-center">
                    <Loader2Icon className="animate-spin" />
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </CardFooter>
        )}
      </Card>
      <div className="flex-1 flex flex-col gap-2">
        {listing.bids.map((bid, index) => (
          <BidItem
            key={bid.id}
            bid={bid}
            leading={index === 0 && !listing.endedAt}
            winner={index === 0 && !!listing.endedAt}
          />
        ))}
      </div>
    </div>
  );
}
function BidItem({
  bid,
  leading,
  winner,
}: {
  bid: Bid;
  leading: boolean;
  winner: boolean;
}) {
  const bidderNostrProfile = useNostrProfile(bid.bidderPubkey);

  return (
    <Item variant="outline">
      <ItemMedia>
        <Avatar className="size-10">
          <AvatarImage
            src={
              bidderNostrProfile?.picture || "https://github.com/evilrabbit.png"
            }
          />
          <AvatarFallback>
            {bidderNostrProfile?.name?.substring(0, 2) || "??"}
          </AvatarFallback>
        </Avatar>
      </ItemMedia>
      <ItemContent>
        <ItemTitle className="flex justify-between items-center w-full">
          <div className="flex items-center justify-center gap-2">
            <a
              href={`https://nostr.com/${nip19.npubEncode(bid.bidderPubkey)}`}
              target="_blank"
            >
              {bidderNostrProfile?.name || "Satoshi Rabbit"}
            </a>
            {leading && <Badge>Leading</Badge>}
            {winner && <Badge>Winner</Badge>}
          </div>
          <div>
            <span className="font-mono text-lg">
              {new Intl.NumberFormat().format(bid.amount)}
            </span>{" "}
            sats ⚡
          </div>
        </ItemTitle>
        {bid.comment && <ItemDescription>{bid.comment}</ItemDescription>}
        <ItemDescription className="flex justify-between items-center w-full">
          <span>
            {formatDistance(bid.createdAt, new Date(), {
              addSuffix: true,
            })}
          </span>
          <FormattedFiatAmount amount={bid.amount} className="inline" />
        </ItemDescription>
      </ItemContent>
    </Item>
  );
}

function Winner({
  winnerPubkey,
  bid,
  hasPin,
  setClaimPreimage,
}: {
  winnerPubkey: string;
  bid: Bid;
  hasPin: boolean;
  setClaimPreimage?: (preimage: string) => void;
}) {
  const isLoggedIn = !!useAppStore((store) => store.token);
  const winnerNostrProfile = useNostrProfile(winnerPubkey);
  return (
    <div className="mt-4 w-full">
      <h2 className="font-semibold">Winner</h2>
      <Item variant="outline" className="w-full">
        <ItemMedia>
          <Avatar className="size-10">
            <AvatarImage
              src={
                winnerNostrProfile?.picture ||
                "https://github.com/evilrabbit.png"
              }
            />
            <AvatarFallback>
              {winnerNostrProfile?.name?.substring(0, 2) || "??"}
            </AvatarFallback>
          </Avatar>
        </ItemMedia>
        <ItemContent>
          <ItemTitle>
            <a
              href={`https://nostr.com/${nip19.npubEncode(bid.bidderPubkey)}`}
              target="_blank"
            >
              {winnerNostrProfile?.name || "Satoshi Rabbit"}
            </a>{" "}
            ⚡{" "}
            <span className="font-mono text-lg">
              {new Intl.NumberFormat().format(bid.amount)}
            </span>{" "}
            sats
          </ItemTitle>
          <ItemDescription>
            {formatDistance(bid.createdAt, new Date(), {
              addSuffix: true,
            })}
          </ItemDescription>
        </ItemContent>
        {!isLoggedIn && !hasPin && (
          <ItemActions>
            <Button size="sm">Login to claim</Button>
            {setClaimPreimage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const preimage = prompt(
                    "Enter your payment preimage from your lightning wallet"
                  );
                  if (!preimage) {
                    return;
                  }
                  setClaimPreimage(preimage);
                }}
              >
                Claim with preimage
              </Button>
            )}
          </ItemActions>
        )}
      </Item>
    </div>
  );
}

function WinnerContactInfo({
  winnerPubkey,
  winnerContactInfo,
}: {
  winnerPubkey: string;
  winnerContactInfo: string | undefined;
}) {
  const winnerNostrProfile = useNostrProfile(winnerPubkey);
  return (
    <Item variant="outline" className="mt-2">
      <ItemMedia>
        <Avatar className="size-10">
          <AvatarImage
            src={
              winnerNostrProfile?.picture || "https://github.com/evilrabbit.png"
            }
          />
          <AvatarFallback>
            {winnerNostrProfile?.name?.substring(0, 2) || "??"}
          </AvatarFallback>
        </Avatar>
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          Winner: {winnerNostrProfile?.name || "Satoshi Rabbit"}
        </ItemTitle>
        <ItemDescription>
          {nip19.npubEncode(winnerPubkey)}
          <br />
          {winnerContactInfo}
        </ItemDescription>
      </ItemContent>
    </Item>
  );
}
