import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { useAppStore } from "@/lib/hooks/useAppStore";
import { useListings } from "@/lib/hooks/useListings";
import { useNostrProfile } from "@/lib/hooks/useNostrProfile";
import { login } from "@/lib/login";
import { Listing } from "@/lib/types";
import { formatDistance } from "date-fns";
import { Link } from "react-router-dom";

export function HomePage() {
  const { data: listings } = useListings();
  const { data: pastListings } = useListings({ past: true });
  const loggedIn = useAppStore((store) => !!store.token);
  return (
    <>
      <h1 className="mt-8 font-semibold text-xl">Active Listings</h1>
      <div className="w-full flex flex-wrap p-4 gap-4 items-center justify-center">
        {listings?.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
      {listings && !listings.length && (
        <div>
          <p className="text-muted-foreground">No active listings</p>
          <div className="mt-4">
            {loggedIn && (
              <Button asChild>
                <Link to="/listings/new">Create Listing</Link>
              </Button>
            )}
            {!loggedIn && <Button onClick={login}>Create Listing</Button>}
          </div>
        </div>
      )}
      {pastListings && (
        <>
          <h1 className="mt-8 font-semibold text-xl">Past Listings</h1>
          <div className="w-full flex flex-wrap p-4 gap-4 items-center justify-center">
            {pastListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  const sellerNostrProfile = useNostrProfile(listing.sellerPubkey);
  return (
    <Link to={`/listings/${listing.id}`}>
      <Card className="pb-0">
        <CardContent>
          <img
            src={listing.imageUrl || "/icon.svg"}
            className="w-64 h-64 object-cover"
          />
        </CardContent>
        <CardHeader>
          <CardTitle>{listing.title}</CardTitle>
          <CardDescription className="whitespace-pre-wrap line-clamp-3">
            {listing.description || "No description provided"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-between items-center">
          <CardDescription>
            <span className="font-mono">
              {new Intl.NumberFormat().format(listing.currentPrice)}
            </span>{" "}
            sats
          </CardDescription>
          <CardDescription>
            <span className="font-mono">{listing.bids.length}</span> bids
          </CardDescription>
        </CardContent>
        {listing.endsAt && listing.endsAt > Date.now() && (
          <CardContent className="flex justify-center -mt-6 -mb-4">
            <p className="font-semibold text-xs">
              Ends in ~{Math.floor((listing.endsAt - Date.now()) / 1000 / 60)}{" "}
              minutes
            </p>
          </CardContent>
        )}

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
              <ItemTitle>{sellerNostrProfile.name}</ItemTitle>
              <ItemDescription>
                {formatDistance(listing.createdAt, new Date(), {
                  addSuffix: true,
                })}
              </ItemDescription>
            </ItemContent>
          </Item>
        )}
      </Card>
    </Link>
  );
}
