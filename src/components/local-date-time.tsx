"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// Formats a timestamp in the viewer's own time zone. The server can't know that
// zone, so it renders the UTC value and the browser swaps in local time after
// hydration (useSyncExternalStore avoids a hydration mismatch).
export function LocalDateTime({
  iso,
  options,
}: {
  iso: string;
  options: Intl.DateTimeFormatOptions;
}) {
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const date = new Date(iso);
  const text = date.toLocaleString(
    undefined,
    isClient ? options : { ...options, timeZone: "UTC" },
  );

  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text}
    </time>
  );
}
