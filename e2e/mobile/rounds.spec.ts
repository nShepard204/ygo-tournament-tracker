import type { Page } from "@playwright/test";
import { DECK_SIZE_MESSAGE } from "../../src/lib/constants";
import { expect, test } from "../support/fixtures";
import {
  dieRollRadio,
  gameRadio,
  pickDieRoll,
  pickGame,
  pickRoundResult,
  roundResultRadio,
} from "../support/ui";

const EVENT_DATE = new Date("2026-11-14T19:00:00Z");

async function openAddRound(page: Page, roundNum: number) {
  await page.getByRole("button", { name: "Add Round to Latest Event" }).click();
  const dialog = page.getByRole("dialog", { name: `Add round ${roundNum}` });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("adding rounds (mobile)", () => {
  test("adds a fully filled-in round to the latest event", async ({ signedInPage: page, db }) => {
    await db.reset([{ eventName: "Friday Locals", eventDateTime: EVENT_DATE }]);
    await page.reload();

    const dialog = await openAddRound(page, 1);
    await expect(dialog).toContainText("To Friday Locals ·");
    await expect(dialog.getByLabel("Round", { exact: true })).toHaveValue("1");
    await expect(dialog.getByRole("heading", { name: "Pre-round info" })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Post-round info" })).toBeVisible();

    await dialog.getByLabel("Table").fill("7");
    await pickDieRoll(dialog, true);
    await dialog.getByLabel("Opponent", { exact: true }).fill("Kaiba");
    await dialog.getByLabel("Opponent's deck").fill("Blue-Eyes");
    await dialog.getByLabel("Deck size").fill("41");
    await pickGame(dialog, 1, "win");
    await pickGame(dialog, 2, "loss");
    await pickGame(dialog, 3, "win");
    await expect(roundResultRadio(dialog, "win")).toBeChecked();
    await dialog.getByLabel("Notes").fill("Close game 3");
    await dialog.getByRole("button", { name: "Add round" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText("Round 1 added")).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit Round #1" })).toBeEnabled();

    const [event] = await db.events();
    expect(event.roundLog).toHaveLength(1);
    expect(event.roundLog[0]).toMatchObject({
      roundNum: 1,
      tableNum: 7,
      dieRollResult: true,
      roundResult: true,
      opponentsName: "Kaiba",
      opponentsDeck: "Blue-Eyes",
      opponentsDeckSize: 41,
      roundNotes: "Close game 3",
      gameResults: { game1Result: true, game2Result: false, game3Result: true },
    });

    // The next add suggests the following round number.
    const next = await openAddRound(page, 2);
    await expect(next.getByLabel("Round", { exact: true })).toHaveValue("2");
  });

  test("saves an empty round with nothing recorded", async ({ signedInPage: page, db }) => {
    await db.reset([{ eventName: "Locals", eventDateTime: EVENT_DATE }]);
    await page.reload();

    const dialog = await openAddRound(page, 1);
    await dialog.getByRole("button", { name: "Add round" }).click();
    await expect(page.getByText("Round 1 added")).toBeVisible();

    const [event] = await db.events();
    const [round] = event.roundLog;
    expect(round.roundNum).toBe(1);
    expect(round.roundResult).toBeUndefined();
    expect(round.dieRollResult).toBeUndefined();
    expect(round.gameResults).toEqual({ game1Result: null, game2Result: null, game3Result: null });
  });

  test("adds to the most recently created event, not the latest-dated one", async ({
    signedInPage: page,
    db,
  }) => {
    await db.reset([
      { eventName: "Future event", eventDateTime: new Date("2027-01-01T18:00:00Z") },
      { eventName: "Just created", eventDateTime: new Date("2026-01-01T18:00:00Z") },
    ]);
    await page.reload();

    const dialog = await openAddRound(page, 1);
    await expect(dialog).toContainText("To Just created ·");
    await dialog.getByRole("button", { name: "Add round" }).click();
    await expect(page.getByText("Round 1 added")).toBeVisible();

    const events = await db.events();
    expect(events.map((e) => [e.eventName, e.roundLog.length])).toEqual([
      ["Future event", 0],
      ["Just created", 1],
    ]);
  });

  test("rejects a round number that's already logged", async ({ signedInPage: page, db }) => {
    await db.reset([{ eventName: "Locals", eventDateTime: EVENT_DATE, roundLog: [{ roundNum: 1 }] }]);
    await page.reload();

    const dialog = await openAddRound(page, 2);
    await dialog.getByLabel("Round", { exact: true }).fill("1");
    await dialog.getByRole("button", { name: "Add round" }).click();

    await expect(dialog.getByText("Round 1 is already logged for this event.")).toBeVisible();
    const [event] = await db.events();
    expect(event.roundLog).toHaveLength(1);
  });

  test("validates the opponent's deck size", async ({ signedInPage: page, db }) => {
    await db.reset([{ eventName: "Locals", eventDateTime: EVENT_DATE }]);
    await page.reload();

    const dialog = await openAddRound(page, 1);
    const deckSize = dialog.getByLabel("Deck size");
    const error = dialog.getByText(DECK_SIZE_MESSAGE);

    // Not flagged while typing, only once the field loses focus.
    await deckSize.fill("30");
    await expect(error).toBeHidden();
    await deckSize.blur();
    await expect(error).toBeVisible();
    await expect(deckSize).toHaveAttribute("aria-invalid", "true");

    // An invalid size blocks the save.
    await dialog.getByRole("button", { name: "Add round" }).click();
    await expect(dialog).toBeVisible();
    expect((await db.events())[0].roundLog).toHaveLength(0);

    // Fixing it clears the message straight away.
    await deckSize.fill("61");
    await expect(error).toBeVisible();
    await deckSize.fill("60");
    await expect(error).toBeHidden();
    await dialog.getByRole("button", { name: "Add round" }).click();
    await expect(page.getByText("Round 1 added")).toBeVisible();
    expect((await db.events())[0].roundLog[0].opponentsDeckSize).toBe(60);
  });
});

test.describe("game results (mobile)", () => {
  test.beforeEach(async ({ signedInPage: page, db }) => {
    await db.reset([{ eventName: "Locals", eventDateTime: EVENT_DATE }]);
    await page.reload();
  });

  test("shows a labeled row for each game", async ({ signedInPage: page }) => {
    const dialog = await openAddRound(page, 1);
    for (const n of [1, 2, 3]) {
      const row = dialog.getByRole("radiogroup", { name: `Game #${n} result` });
      await expect(row).toBeVisible();
      await expect(gameRadio(row, n, "win")).toBeEnabled();
      await expect(gameRadio(row, n, "loss")).toBeEnabled();
    }
  });

  test("losing games 2 and 3 makes the round a loss", async ({ signedInPage: page }) => {
    const dialog = await openAddRound(page, 1);
    await pickGame(dialog, 1, "win");
    await expect(roundResultRadio(dialog, "win")).not.toBeChecked();
    await expect(roundResultRadio(dialog, "loss")).not.toBeChecked();

    await pickGame(dialog, 2, "loss");
    await expect(roundResultRadio(dialog, "loss")).not.toBeChecked();

    await pickGame(dialog, 3, "loss");
    await expect(roundResultRadio(dialog, "loss")).toBeChecked();
    await expect(roundResultRadio(dialog, "win")).not.toBeChecked();
  });

  test("winning games 1 and 2 makes the round a win and grays out game 3", async ({
    signedInPage: page,
  }) => {
    const dialog = await openAddRound(page, 1);
    await pickGame(dialog, 1, "win");
    await pickGame(dialog, 2, "win");

    await expect(roundResultRadio(dialog, "win")).toBeChecked();
    await expect(gameRadio(dialog, 3, "win")).toBeDisabled();
    await expect(gameRadio(dialog, 3, "loss")).toBeDisabled();
    await expect(dialog.getByRole("radiogroup", { name: "Game #3 result" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  test("game 3 re-enables, cleared, when games 1 and 2 stop matching", async ({ signedInPage: page }) => {
    const dialog = await openAddRound(page, 1);
    await pickGame(dialog, 1, "loss");
    await pickGame(dialog, 2, "win");
    await pickGame(dialog, 3, "win");
    await expect(gameRadio(dialog, 3, "win")).toBeChecked();
    await expect(roundResultRadio(dialog, "win")).toBeChecked();

    // Games 1 and 2 now match: game 3 is dropped and the round flips to a win.
    await pickGame(dialog, 1, "win");
    await expect(gameRadio(dialog, 3, "win")).toBeDisabled();
    await expect(gameRadio(dialog, 3, "win")).not.toBeChecked();

    // Unmatching them brings game 3 back without the old pick.
    await pickGame(dialog, 2, "loss");
    await expect(gameRadio(dialog, 3, "win")).toBeEnabled();
    await expect(gameRadio(dialog, 3, "win")).not.toBeChecked();
    await expect(gameRadio(dialog, 3, "loss")).not.toBeChecked();
  });

  test("clicking a picked game result again clears it", async ({ signedInPage: page }) => {
    const dialog = await openAddRound(page, 1);
    await pickGame(dialog, 1, "win");
    await expect(gameRadio(dialog, 1, "win")).toBeChecked();
    await pickGame(dialog, 1, "win");
    await expect(gameRadio(dialog, 1, "win")).not.toBeChecked();
    await expect(gameRadio(dialog, 1, "loss")).not.toBeChecked();
  });

  test("leaves a manually chosen round result alone until two games agree", async ({
    signedInPage: page,
  }) => {
    const dialog = await openAddRound(page, 1);
    await pickRoundResult(dialog, "win");
    await pickGame(dialog, 1, "loss");
    await expect(roundResultRadio(dialog, "win")).toBeChecked();

    await pickGame(dialog, 2, "loss");
    await expect(roundResultRadio(dialog, "loss")).toBeChecked();

    // The player can still override the result by hand afterwards.
    await pickRoundResult(dialog, "win");
    await expect(roundResultRadio(dialog, "win")).toBeChecked();
  });

  test("doesn't save a game 3 result when games 1 and 2 match", async ({ signedInPage: page, db }) => {
    const dialog = await openAddRound(page, 1);
    await pickGame(dialog, 1, "loss");
    await pickGame(dialog, 2, "win");
    await pickGame(dialog, 3, "loss");
    await pickGame(dialog, 2, "loss");
    await dialog.getByRole("button", { name: "Add round" }).click();
    await expect(page.getByText("Round 1 added")).toBeVisible();

    const [event] = await db.events();
    expect(event.roundLog[0]).toMatchObject({
      roundResult: false,
      gameResults: { game1Result: false, game2Result: false, game3Result: null },
    });
  });
});

test.describe("editing the latest round (mobile)", () => {
  test("prefills the round and saves changes", async ({ signedInPage: page, db }) => {
    await db.reset([
      {
        eventName: "Locals",
        eventDateTime: EVENT_DATE,
        roundLog: [
          { roundNum: 1, roundResult: true, opponentsName: "Joey" },
          {
            roundNum: 2,
            tableNum: 4,
            dieRollResult: false,
            opponentsName: "Mai",
            opponentsDeck: "Harpies",
            opponentsDeckSize: 40,
            roundNotes: "Mid-round",
            gameResults: { game1Result: true, game2Result: null, game3Result: null },
          },
        ],
      },
    ]);
    await page.reload();

    await page.getByRole("button", { name: "Edit Round #2" }).click();
    const dialog = page.getByRole("dialog", { name: "Edit Round #2" });
    await expect(dialog).toContainText("In Locals ·");
    await expect(dialog.getByLabel("Round", { exact: true })).toHaveValue("2");
    await expect(dialog.getByLabel("Table")).toHaveValue("4");
    await expect(dieRollRadio(dialog, false)).toBeChecked();
    await expect(dialog.getByLabel("Opponent", { exact: true })).toHaveValue("Mai");
    await expect(dialog.getByLabel("Opponent's deck")).toHaveValue("Harpies");
    await expect(dialog.getByLabel("Deck size")).toHaveValue("40");
    await expect(dialog.getByLabel("Notes")).toHaveValue("Mid-round");
    await expect(gameRadio(dialog, 1, "win")).toBeChecked();
    await expect(roundResultRadio(dialog, "win")).not.toBeChecked();
    await expect(roundResultRadio(dialog, "loss")).not.toBeChecked();

    await pickGame(dialog, 2, "win");
    await expect(roundResultRadio(dialog, "win")).toBeChecked();
    // Clicking the picked die roll again un-records it.
    await pickDieRoll(dialog, false);
    await dialog.getByLabel("Notes").fill("Won in two");
    await dialog.getByRole("button", { name: "Save round" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText("Round 2 updated")).toBeVisible();

    const [event] = await db.events();
    const round = event.roundLog.find((r) => r.roundNum === 2)!;
    expect(round).toMatchObject({
      roundResult: true,
      roundNotes: "Won in two",
      opponentsName: "Mai",
      gameResults: { game1Result: true, game2Result: true, game3Result: null },
    });
    expect(round.dieRollResult).toBeUndefined();
    // The other round is untouched.
    expect(event.roundLog.find((r) => r.roundNum === 1)).toMatchObject({ opponentsName: "Joey", roundResult: true });
  });
});
