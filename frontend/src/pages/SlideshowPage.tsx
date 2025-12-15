import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useListing } from "@/lib/hooks/useListing";
import { useListings } from "@/lib/hooks/useListings";
import { ListingPageInternal } from "@/pages/ListingPage";
import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

export function SlideshowPage() {
  const [urlParams] = useSearchParams();

  const keyword = urlParams.get("keyword");
  const duration = urlParams.get("duration");
  if (!keyword || !duration) {
    return <NewSlideshowPage />;
  }
  const durationValue = parseInt(duration);
  if (isNaN(durationValue)) {
    return <p>Invalid duration</p>;
  }

  return <SlideshowPageInternal keyword={keyword} duration={durationValue} />;
}

function SlideshowPageInternal({
  keyword,
  duration,
}: {
  keyword: string;
  duration: number;
}) {
  // TODO: filter by keyword serverside
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    const timeout = setInterval(() => {
      setCurrentIndex((current) => current + 1);
    }, duration * 1000);
    return () => {
      clearInterval(timeout);
    };
  }, [duration]);

  const { data: activeListings } = useListings();
  const keywordListings = React.useMemo(
    () =>
      activeListings?.filter(
        (listing) =>
          listing.title.toLowerCase().includes(keyword.toLowerCase()) ||
          listing.description?.toLowerCase().includes(keyword.toLowerCase())
      ),
    [activeListings, keyword]
  );
  if (!keywordListings) {
    return <p>Loading...</p>;
  }
  if (!keywordListings.length) {
    return <p>No listings found for keyword: {keyword}</p>;
  }

  return (
    <>
      <p className="text-muted-foreground font-mono text-xs">
        Listing {(currentIndex % keywordListings.length) + 1} /{" "}
        {keywordListings.length}
      </p>
      <CountdownTimer index={currentIndex} duration={duration} />
      <SlideshowListing
        id={keywordListings[currentIndex % keywordListings.length].id}
      />
    </>
  );
}

function SlideshowListing({ id }: { id: string }) {
  const { data: listing } = useListing(id);
  if (!listing) {
    return <p>Loading listing...</p>;
  }
  return <ListingPageInternal listing={listing} slideshow />;
}

function CountdownTimer({
  duration,
  index,
}: {
  index: number;
  duration: number;
}) {
  const [prevIndex, setPrevIndex] = useState(index);
  const [remaining, setRemaining] = useState(duration);
  React.useEffect(() => {
    if (prevIndex !== index) {
      setRemaining(duration);
      setPrevIndex(index);
    }
  }, [duration, index, prevIndex]);
  React.useEffect(() => {
    const timeout = setInterval(() => {
      setRemaining((current) => current - 1);
    }, 1000);
    return () => {
      clearInterval(timeout);
    };
  }, [duration, index]);

  return (
    <p className="text-muted-foreground font-mono text-xs mt-2">
      Displaying next listing in {remaining} seconds
    </p>
  );
}

function NewSlideshowPage() {
  const [, setUrlParams] = useSearchParams();
  const [keyword, setKeyword] = React.useState("");
  const [duration, setDuration] = React.useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const durationSeconds = parseInt(duration);
    if (isNaN(durationSeconds)) {
      toast.error("Invalid duration");
      return;
    }
    setUrlParams({
      keyword,
      duration,
    });
  }

  return (
    <div className="w-full max-w-md p-4">
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="title">Search Keyword*</FieldLabel>
            <Input
              id="title"
              placeholder="Xmas Party 2025"
              required
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <FieldDescription>
              Display auctions with a title or description matching the given
              keyword
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="title">Slide Duration</FieldLabel>
            <Input
              id="title"
              placeholder="30"
              required
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <FieldDescription>
              How long a listing is shown in seconds
            </FieldDescription>
          </Field>
          <Field orientation="horizontal">
            <Button type="submit">View Slideshow</Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
