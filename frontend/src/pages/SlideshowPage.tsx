import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useListings } from "@/lib/hooks/useListings";
import { ListingPageInternal } from "@/pages/ListingPage";
import React from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

export function SlideshowPage() {
  const [urlParams] = useSearchParams();

  const keyword = urlParams.get("keyword");
  const duration = urlParams.get("duration");
  if (!keyword || !duration) {
    return <NewSlideshowPage />;
  }
  return <SlideshowPageInternal keyword={keyword} duration={duration} />;
}

function SlideshowPageInternal({
  keyword,
  duration,
}: {
  keyword: string;
  duration: string;
}) {
  // TODO: filter by keyword serverside
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    const timeout = setInterval(() => {
      setCurrentIndex((current) => current + 1);
    }, parseInt(duration));
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
    <ListingPageInternal
      listing={keywordListings[currentIndex % keywordListings.length]}
      slideshow
    />
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
      duration: (durationSeconds * 1000).toString(),
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
