import { LocalDateTime } from "@/components/local-date-time";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { EventDTO } from "@/lib/dal";

// e.g. "Oct 28, 2026, 7:00 PM EDT". Spelled out field by field because
// timeZoneName can't be combined with dateStyle/timeStyle (Intl throws).
const EVENT_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
};

export function EventCard({ event: e, showRounds = false }: { event: EventDTO; showRounds?: boolean }) {
  const wins = e.roundLog.filter((r) => r.roundResult).length;
  const losses = e.roundLog.length - wins;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {e.eventName || "Untitled event"}
          {e.isPremierEvent && (
            <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
              Premier
            </span>
          )}
        </CardTitle>
        <CardDescription>
          {e.eventFormat} ·{" "}
          <LocalDateTime iso={e.eventDateTime} options={EVENT_TIME_FORMAT} />
          {e.eventLocation ? ` · ${e.eventLocation}` : ""}
          {e.playerCount ? ` · ${e.playerCount} players` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-1 text-sm text-muted-foreground">
        <p>
          Deck: {e.deck || "—"} · Record: {wins}-{losses}
        </p>
        {e.eventNotes && <p>{e.eventNotes}</p>}
        {showRounds && e.roundLog.length > 0 && (
          <ol className="mt-2 grid gap-1 border-t pt-2">
            {e.roundLog.map((r) => (
              <li key={r.roundNum} className="flex gap-2">
                <span className="w-8 shrink-0 font-medium text-foreground">R{r.roundNum}</span>
                <span className={r.roundResult ? "text-foreground" : ""}>{r.roundResult ? "W" : "L"}</span>
                <span className="truncate">
                  vs {r.opponentsName || "Unknown"}
                  {r.opponentsDeck ? ` (${r.opponentsDeck})` : ""}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
