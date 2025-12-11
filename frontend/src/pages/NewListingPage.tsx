import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/lib/hooks/useAppStore";
import { useUserSettings } from "@/lib/hooks/useUserSettings";
import { ChevronDownIcon } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function NewListingPage() {
  const { data: userSettings } = useUserSettings();
  const navigate = useNavigate();
  const token = useAppStore((store) => store.token);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [startingBid, setStartingBid] = React.useState("");
  const [isPublic, setPublic] = React.useState(true);
  const [hasFixedEndDate, setFixedEndDate] = React.useState(false);
  const [hasMinimumNextBid, setHasMinimumNextBid] = React.useState(false);
  const [minimumBidAbsolute, setMinimumBidAbsolute] = React.useState("");
  const [minimumBidPercentage, setMinimumBidPercentage] = React.useState("");
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);
  const [endsAt, setEndsAt] = React.useState<Date>(new Date());

  React.useEffect(() => {
    if (token && userSettings && !userSettings.receiveOnlyConnectionSecret) {
      toast("Please set a receive-only connection secret first");
      navigate("/settings");
    }
  }, [navigate, token, userSettings]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (hasFixedEndDate && !endsAt) {
      toast.error("Please set the ends at date");
      return;
    }
    try {
      const response = await fetch("/api/listings", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          imageUrl,
          startingBid: parseInt(startingBid),
          public: isPublic,
          endsAt: hasFixedEndDate ? endsAt.getTime() : undefined,
          minimumBidAbsolute: hasMinimumNextBid
            ? parseInt(minimumBidAbsolute)
            : undefined,
          minimumBidPercentage: hasMinimumNextBid
            ? parseInt(minimumBidPercentage)
            : undefined,
        }),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const { id } = await response.json();
      toast("Created listing successfully");
      navigate(`/listings/${id}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update user settings: ", {
        description: "" + error,
      });
    }
  }

  return (
    <div className="w-full max-w-md p-4">
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="title">Item Title*</FieldLabel>
            <Input
              id="title"
              placeholder="Alby T-Shirt"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <FieldDescription>What are you selling?</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Textarea
              id="description"
              placeholder="Bitcoin ipsum dolor sit amet. Private key block height blockchain full node inputs key pair inputs. Satoshi Nakamoto wallet Merkle Tree decentralized SHA-256."
              className="resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <FieldDescription>
              Give more details about your item
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="image-url">Image URL</FieldLabel>
            <Input
              id="image-url"
              placeholder="https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            <FieldDescription>
              Upload an image somewhere and paste the URL here
            </FieldDescription>
          </Field>
          <FieldSeparator />
          <Field>
            <FieldLabel htmlFor="starting-bid">
              Starting Bid (in sats)
            </FieldLabel>
            <Input
              id="starting-bid"
              placeholder="1"
              type="number"
              value={startingBid}
              onChange={(e) => setStartingBid(e.target.value)}
            />
            <FieldDescription>
              Ensure your item is sold for a price equal or higher than this
              value
            </FieldDescription>
          </Field>
          <Field>
            <Field orientation="horizontal">
              <Checkbox
                id="fixed-end-date"
                checked={hasMinimumNextBid}
                onCheckedChange={(e) => setHasMinimumNextBid(!!e)}
              />
              <FieldLabel htmlFor="fixed-end-date" className="font-normal">
                Minimum Next Bid
              </FieldLabel>
            </Field>
            <FieldDescription className="!text-wrap">
              Set minimum next bid amount to avoid auction extending too long
            </FieldDescription>
          </Field>

          {hasMinimumNextBid && (
            <>
              <Field>
                <FieldLabel htmlFor="minimum-absolute">
                  Minimum Bid Absolute Value (in sats)
                </FieldLabel>
                <Input
                  id="minimum-absolute"
                  placeholder="1000"
                  type="number"
                  required
                  value={minimumBidAbsolute}
                  onChange={(e) => setMinimumBidAbsolute(e.target.value)}
                />
                <FieldDescription>
                  Each bid must be at least this amount of sats above the
                  previous bid
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="minimum-absolute">
                  Minimum Bid Percentage Value
                </FieldLabel>
                <Input
                  id="minimum-absolute"
                  placeholder="1"
                  type="number"
                  required
                  value={minimumBidPercentage}
                  onChange={(e) => setMinimumBidPercentage(e.target.value)}
                />
                <FieldDescription>
                  Each bid must be at least this % above the previous bid
                </FieldDescription>
              </Field>
            </>
          )}

          <FieldSeparator />

          <Field>
            <Field orientation="horizontal">
              <Checkbox
                id="public"
                checked={isPublic}
                onCheckedChange={(e) => setPublic(!!e)}
              />
              <FieldLabel htmlFor="public" className="font-normal">
                Public
              </FieldLabel>
            </Field>
            <FieldDescription>
              Public listings will be listed on the homepage
            </FieldDescription>
          </Field>

          <Field>
            <Field orientation="horizontal">
              <Checkbox
                id="fixed-end-date"
                checked={hasFixedEndDate}
                onCheckedChange={(e) => setFixedEndDate(!!e)}
              />
              <FieldLabel htmlFor="fixed-end-date" className="font-normal">
                Fixed End Date
              </FieldLabel>
            </Field>
            <FieldDescription>
              Set a fixed end date and time for the auction
            </FieldDescription>
          </Field>

          {hasFixedEndDate && (
            <Field>
              <div className="flex gap-4">
                <div className="flex flex-col gap-3">
                  <Popover
                    open={datePickerOpen}
                    onOpenChange={setDatePickerOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        id="date-picker"
                        className="w-32 justify-between font-normal"
                      >
                        {endsAt ? endsAt.toLocaleDateString() : "Select date"}
                        <ChevronDownIcon />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto overflow-hidden p-0"
                      align="start"
                    >
                      <Calendar
                        mode="single"
                        required
                        disabled={{ before: new Date() }}
                        selected={endsAt}
                        captionLayout="dropdown"
                        onSelect={(date) => {
                          setEndsAt(date);
                          setDatePickerOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex flex-col gap-3">
                  {/* <Label htmlFor="time-picker" className="px-1">
                  Time
                </Label> */}
                  <Input
                    type="time"
                    id="time-picker"
                    step="1"
                    required
                    value={endsAt?.toTimeString().slice(0, 8)}
                    onChange={(e) => {
                      const endsAtTime = e.target.value;
                      if (endsAt && endsAtTime) {
                        const [hours, minutes, seconds = "0"] =
                          endsAtTime.split(":");
                        const newDate = new Date(endsAt);
                        newDate.setHours(
                          parseInt(hours),
                          parseInt(minutes),
                          parseInt(seconds)
                        );
                        setEndsAt(newDate);
                      }
                    }}
                    className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                  />
                </div>
              </div>
              {endsAt && (
                <FieldDescription>
                  Auction will end at {new Date(endsAt).toISOString()} UTC
                </FieldDescription>
              )}
              {!endsAt && (
                <FieldDescription>Please select a date.</FieldDescription>
              )}
              <FieldDescription>
                Note: auction will be automatically extended if any payment is
                made within the last few minutes.
              </FieldDescription>
            </Field>
          )}

          <Field orientation="horizontal">
            <Button type="submit">Submit</Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => navigate("/")}
            >
              Cancel
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
