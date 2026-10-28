"use client";

import { useState, type ReactElement } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreateEventForm } from "./create-event-form";

export function CreateEventDialog({ trigger }: { trigger: ReactElement }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New event</DialogTitle>
        </DialogHeader>
        <CreateEventForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
