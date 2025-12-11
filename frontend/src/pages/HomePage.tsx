import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppStore } from "@/lib/hooks/useAppStore";
import { useListings } from "@/lib/hooks/useListings";
import { login } from "@/lib/login";
import { Link } from "react-router-dom";

export function HomePage() {
  const { data: listings } = useListings();
  const loggedIn = useAppStore((store) => !!store.token);
  return (
    <>
      <h1 className="mt-8 font-semibold text-xl">Active Listings</h1>
      <div className="w-full flex flex-wrap p-4 gap-4">
        {listings?.map((listing) => (
          <Link to={`/listings/${listing.id}`} key={listing.id}>
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
              {listing.endsAt && listing.endsAt > Date.now() && (
                <CardContent className="flex justify-center -mt-6 -mb-4">
                  <p className="font-semibold text-xs">
                    Ends in ~
                    {Math.floor((listing.endsAt - Date.now()) / 1000 / 60)}{" "}
                    minutes
                  </p>
                </CardContent>
              )}
              {/* <CardFooter className="text-xs">
                By{" "}
                {nip19.npubEncode(listing.sellerPubkey).substring(0, 21) +
                  "..."}
              </CardFooter> */}
            </Card>
          </Link>
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
    </>
  );
}
