// Shared between server models and client components (no server-only imports).
export const EVENT_FORMATS = [
  "Advanced",
  "Genesys",
  "Edison",
  "GOAT",
  "Other",
] as const;

export const DECK_SIZE_MESSAGE = "Deck size must be a whole number from 40 to 60";
