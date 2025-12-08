import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/lib/hooks/useAppStore";
import { useUserSettings } from "@/lib/hooks/useUserSettings";
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

  React.useEffect(() => {
    if (token && userSettings && !userSettings.receiveOnlyConnectionSecret) {
      toast("Please set a receive-only connection secret first");
      navigate("/settings");
    }
  }, [navigate, token, userSettings]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const response = await fetch("/api/listings", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          imageUrl,
          startingBid: parseInt(startingBid),
          public: isPublic,
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
              value.
            </FieldDescription>
          </Field>
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
              Public listings will be listed on the homepage.
            </FieldDescription>
          </Field>

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
