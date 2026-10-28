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
import { reportBug, type ReportBugState } from "./actions";

export function ReportBugDialog({ trigger }: { trigger: ReactElement }) {
  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <ReportBugForm />
      </DialogContent>
    </Dialog>
  );
}

// Lives inside DialogContent so its state resets each time the dialog opens.
function ReportBugForm() {
  const [state, formAction, pending] = useActionState<ReportBugState, FormData>(reportBug, {});
  const pathname = usePathname();

  if (state.issueUrl) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Thanks for the report</DialogTitle>
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
        <DialogTitle>Report a bug</DialogTitle>
        <DialogDescription>Tell us what went wrong. This creates an issue on the project&apos;s GitHub.</DialogDescription>
      </DialogHeader>
      <form action={formAction} className="grid gap-4">
        <input type="hidden" name="page" value={pathname} />
        <div className="grid gap-2">
          <Label htmlFor="bug-title">Title</Label>
          <Input id="bug-title" name="title" placeholder="Event form won't save" required minLength={5} maxLength={120} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="bug-description">What happened?</Label>
          <Textarea
            id="bug-description"
            name="description"
            rows={5}
            placeholder="What you did, what you expected, and what happened instead"
            required
            minLength={10}
            maxLength={5000}
          />
        </div>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit report"}
        </Button>
      </form>
    </>
  );
}
