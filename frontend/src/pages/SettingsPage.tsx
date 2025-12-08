import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/lib/hooks/useAppStore";
import { UserSettings, useUserSettings } from "@/lib/hooks/useUserSettings";
import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function SettingsPage() {
  const { data: userSettings } = useUserSettings();

  if (userSettings) {
    return <SettingsPageInternal userSettings={userSettings} />;
  }
}

export function SettingsPageInternal({
  userSettings,
}: {
  userSettings: UserSettings;
}) {
  const [saving, setSaving] = React.useState(false);
  const { mutate: reloadUserSettings } = useUserSettings();
  const navigate = useNavigate();
  const token = useAppStore((store) => store.token);
  const [receiveOnlyConnectionSecret, setReceiveOnlyConnectionSecret] =
    React.useState(userSettings.receiveOnlyConnectionSecret || "");
  const [contactInfo, setContactInfo] = React.useState(
    userSettings.contactInfo || ""
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/users/settings", {
        method: "PATCH",
        body: JSON.stringify({
          receiveOnlyConnectionSecret,
          contactInfo,
        }),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      toast("Updated user settings successfully");
      await reloadUserSettings();
      navigate("/");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update user settings: ", {
        description: "" + error,
      });
    }
    setSaving(false);
  }

  return (
    <div className="w-full max-w-md p-4">
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="additional-contact-methods">
              Additional Contact Methods
            </FieldLabel>
            <Textarea
              id="additional-contact-methods"
              placeholder="Add ways outside of Nostr DMs that you can be contacted when winning e.g. an email address"
              className="resize-none"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="receive-only-connection-secret">
              Receive-Only Connection Secret
            </FieldLabel>
            <Input
              id="receive-only-connection-secret"
              placeholder="nostr+walletconnect://..."
              value={receiveOnlyConnectionSecret}
              onChange={(e) => setReceiveOnlyConnectionSecret(e.target.value)}
            />
            <FieldDescription>
              Required for sellers only. An NWC wallet with HOLD invoice support
              (such as{" "}
              <a
                href="https://getalby.com/alby-hub"
                className="underline"
                target="_blank"
              >
                Alby Hub
              </a>
              ) is needed.
            </FieldDescription>
          </Field>

          <Field orientation="horizontal">
            <LoadingButton loading={saving} type="submit">
              Save
            </LoadingButton>
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
