"use client";

import { useActionState, type ReactElement } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { suggestFeature, type SuggestFeatureState } from "./actions";

export function SuggestFeatureDialog({ trigger }: { trigger: ReactElement }) {
  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <SuggestFeatureForm />
      </DialogContent>
    </Dialog>
  );
}

// Lives inside DialogContent so its state resets each time the dialog opens.
function SuggestFeatureForm() {
  const [state, formAction, pending] = useActionState<SuggestFeatureState, FormData>(suggestFeature, {});
  const pathname = usePathname();

  if (state.issueUrl) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Thanks for the suggestion</DialogTitle>
          <DialogDescription>
            It was filed as{" "}
            <a href={state.issueUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              issue #{state.issueNumber}
            </a>
            .
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button />}>Done</DialogClose>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Suggest a feature</DialogTitle>
        <DialogDescription>
          Tell us what you&apos;d like the app to do. This creates an issue on the project&apos;s GitHub.
        </DialogDescription>
      </DialogHeader>
      <form action={formAction} className="grid gap-4">
        <input type="hidden" name="page" value={pathname} />
        <div className="grid gap-2">
          <Label htmlFor="feature-title">Title</Label>
          <Input id="feature-title" name="title" placeholder="Track side deck changes" required minLength={5} maxLength={120} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="feature-description">What would you like?</Label>
          <Textarea
            id="feature-description"
            name="description"
            rows={5}
            placeholder="What the feature does and how it would help you"
            required
            minLength={10}
            maxLength={5000}
          />
        </div>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit suggestion"}
        </Button>
      </form>
    </>
  );
}
