// Shared between server models and client components (no server-only imports).
export const TOURNAMENT_FORMATS = ["Advanced", "Traditional", "Edison", "GOAT", "Other"] as const;
export const TOURNAMENT_STATUSES = ["upcoming", "in_progress", "completed"] as const;
