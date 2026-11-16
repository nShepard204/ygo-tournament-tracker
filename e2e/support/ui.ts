import type { Locator, Page } from "@playwright/test";

type Scope = Page | Locator;
export type Outcome = "win" | "loss";

/** The event card on the home page or event log whose title is `name`. */
export function eventCard(page: Page, name: string) {
  return page
    .locator('[data-slot="card"]')
    .filter({ has: page.locator('[data-slot="card-title"]', { hasText: name }) });
}

/** The <dd> paired with the <dt> labeled `label` in a round's detail list. */
export function detail(scope: Scope, label: string) {
  return scope
    .locator("dt", { hasText: new RegExp(`^${label}$`) })
    .locator("xpath=following-sibling::dd[1]");
}

/** The trigger's accessible name runs the number into the badge, e.g. "Round 1W vs Kaiba". */
export function roundTriggerName(n: number) {
  return new RegExp(`^Round ${n}(?!\\d)`);
}

/** The accordion item for round `n` in an event's rounds popup. */
export function roundItem(scope: Locator, n: number) {
  return scope
    .locator('[data-slot="accordion-item"]')
    .filter({ has: scope.page().getByRole("button", { name: roundTriggerName(n) }) });
}

/** Expands round `n` in an event's rounds popup and returns its accordion item. */
export async function openRound(scope: Locator, n: number) {
  const item = roundItem(scope, n);
  await item.getByRole("button", { name: roundTriggerName(n) }).click();
  return item;
}

// The yes/no buttons are visually hidden radios inside <label title="…">, so
// clicks go to the label (what the user sees) and state is read from the radio.

export function gameRadio(scope: Scope, game: number, outcome: Outcome) {
  return scope.getByRole("radio", { name: `${outcome === "win" ? "Won" : "Lost"} game ${game}` });
}

export async function pickGame(scope: Scope, game: number, outcome: Outcome) {
  await scope.getByTitle(`${outcome === "win" ? "Won" : "Lost"} game ${game}`).click();
}

export function roundResultRadio(scope: Scope, outcome: Outcome) {
  return scope.getByRole("radio", { name: outcome === "win" ? "Won the round" : "Lost the round" });
}

export async function pickRoundResult(scope: Scope, outcome: Outcome) {
  await scope.getByTitle(outcome === "win" ? "Won the round" : "Lost the round").click();
}

export function dieRollRadio(scope: Scope, won: boolean) {
  return scope.getByRole("radio", { name: won ? "Won the die roll" : "Lost the die roll" });
}

export async function pickDieRoll(scope: Scope, won: boolean) {
  await scope.getByTitle(won ? "Won the die roll" : "Lost the die roll").click();
}
