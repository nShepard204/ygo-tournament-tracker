import { expect, test } from "../support/fixtures";
import {
  detail,
  eventCard,
  gameRadio,
  pickGame,
  openRound,
  roundResultRadio,
} from "../support/ui";

const EVENT_DATE = new Date("2026-07-11T16:00:00Z");

test.describe("event rounds popup (desktop)", () => {
  test("shows a message when no rounds are logged", async ({ signedInPage: page, db }) => {
    await db.reset([{ eventName: "Empty event", eventDateTime: EVENT_DATE }]);
    await page.reload();

    await page.getByRole("button", { name: "View rounds for Empty event" }).click();
    const dialog = page.getByRole("dialog", { name: "Empty event" });
    await expect(dialog).toContainText("0 rounds · Record 0-0");
    await expect(dialog.getByText("No rounds logged yet.")).toBeVisible();
  });

  test("lists rounds in order with their full details", async ({ signedInPage: page, db }) => {
    await db.reset([
      {
        eventName: "YCS",
        eventDateTime: EVENT_DATE,
        roundLog: [
          // Stored out of order; the popup sorts by round number.
          {
            roundNum: 2,
            roundResult: false,
            opponentsName: "Joey",
            gameResults: { game1Result: false, game2Result: false, game3Result: null },
          },
          {
            roundNum: 1,
            tableNum: 12,
            roundResult: true,
            dieRollResult: false,
            opponentsName: "Kaiba",
            opponentsDeck: "Blue-Eyes",
            opponentsDeckSize: 42,
            roundNotes: "Went to time in game 3",
            gameResults: { game1Result: true, game2Result: false, game3Result: true },
          },
          // Saved before game tracking existed: no gameResults at all.
          { roundNum: 3 },
        ],
      },
    ]);
    await page.reload();

    await page.getByRole("button", { name: "View rounds for YCS" }).click();
    const dialog = page.getByRole("dialog", { name: "YCS" });
    await expect(dialog).toContainText("3 rounds · Record 1-1");

    const triggers = dialog.locator('[data-slot="accordion-trigger"]');
    await expect(triggers).toHaveText([/Round 1\s*W\s*vs Kaiba/, /Round 2\s*L\s*vs Joey/, /Round 3\s*–\s*vs Unknown/]);

    const round1 = await openRound(dialog, 1);
    await expect(detail(round1, "Result")).toHaveText("Won");
    await expect(detail(round1, "Die roll")).toHaveText("Lost");
    await expect(detail(round1, "Table")).toHaveText("12");
    await expect(detail(round1, "Opponent")).toHaveText("Kaiba");
    await expect(detail(round1, "Their deck")).toHaveText("Blue-Eyes");
    await expect(detail(round1, "Deck size")).toHaveText("42");
    await expect(detail(round1, "Notes")).toHaveText("Went to time in game 3");
    const games1 = detail(round1, "Games");
    await expect(games1.getByLabel("Game 1: won")).toHaveText("W");
    await expect(games1.getByLabel("Game 2: lost")).toHaveText("L");
    await expect(games1.getByLabel("Game 3: won")).toHaveText("W");

    // Game 3 isn't shown when the first two games decided the round.
    const round2 = await openRound(dialog, 2);
    const games2 = detail(round2, "Games");
    await expect(games2.getByLabel("Game 1: lost")).toBeVisible();
    await expect(games2.getByLabel("Game 2: lost")).toBeVisible();
    await expect(games2.getByLabel(/Game 3/)).toHaveCount(0);

    // Unrecorded fields show a dash, and empty notes are hidden.
    const round3 = await openRound(dialog, 3);
    for (const label of ["Result", "Die roll", "Table", "Opponent", "Their deck", "Deck size", "Games"]) {
      await expect(detail(round3, label)).toHaveText("—");
    }
    await expect(round3.locator("dt", { hasText: /^Notes$/ })).toHaveCount(0);
  });

  test("shows unrecorded games as a dash badge", async ({ signedInPage: page, db }) => {
    await db.reset([
      {
        eventName: "Partial",
        eventDateTime: EVENT_DATE,
        roundLog: [{ roundNum: 1, gameResults: { game1Result: true, game2Result: null, game3Result: null } }],
      },
    ]);
    await page.reload();

    await page.getByRole("button", { name: "View rounds for Partial" }).click();
    const round = await openRound(page.getByRole("dialog", { name: "Partial" }), 1);
    const games = detail(round, "Games");
    await expect(games.getByLabel("Game 1: won")).toHaveText("W");
    await expect(games.getByLabel("Game 2: not recorded")).toHaveText("–");
    await expect(games.getByLabel("Game 3: not recorded")).toHaveText("–");
  });

  test("edits a round, including its game results", async ({ signedInPage: page, db }) => {
    await db.reset([
      {
        eventName: "Locals",
        eventDateTime: EVENT_DATE,
        roundLog: [
          {
            roundNum: 1,
            tableNum: 3,
            opponentsName: "Yugi",
            opponentsDeckSize: 40,
            gameResults: { game1Result: true, game2Result: null, game3Result: null },
          },
        ],
      },
    ]);
    await page.reload();

    await page.getByRole("button", { name: "View rounds for Locals" }).click();
    const rounds = page.getByRole("dialog", { name: "Locals" });
    const round = await openRound(rounds, 1);
    await round.getByRole("button", { name: "Edit" }).click();

    const form = page.getByRole("dialog", { name: "Edit round 1" });
    await expect(form.getByLabel("Opponent", { exact: true })).toHaveValue("Yugi");
    await expect(form.getByLabel("Table")).toHaveValue("3");
    await expect(gameRadio(form, 1, "win")).toBeChecked();
    await expect(gameRadio(form, 2, "win")).not.toBeChecked();
    await expect(gameRadio(form, 2, "loss")).not.toBeChecked();

    await form.getByLabel("Opponent", { exact: true }).fill("Yami Yugi");
    // Clearing an optional number removes it.
    await form.getByLabel("Deck size").fill("");
    await pickGame(form, 2, "loss");
    await pickGame(form, 3, "loss");
    await expect(roundResultRadio(form, "loss")).toBeChecked();
    await form.getByRole("button", { name: "Save round" }).click();
    await expect(form).toBeHidden();

    await expect(rounds.locator('[data-slot="accordion-trigger"]')).toHaveText([/Round 1\s*L\s*vs Yami Yugi/]);

    const [event] = await db.events();
    expect(event.roundLog[0]).toMatchObject({
      roundNum: 1,
      tableNum: 3,
      opponentsName: "Yami Yugi",
      roundResult: false,
      gameResults: { game1Result: true, game2Result: false, game3Result: false },
    });
    expect(event.roundLog[0].opponentsDeckSize).toBeUndefined();
  });

  test("won't renumber a round onto an existing round number", async ({ signedInPage: page, db }) => {
    await db.reset([
      {
        eventName: "Locals",
        eventDateTime: EVENT_DATE,
        roundLog: [{ roundNum: 1 }, { roundNum: 2 }],
      },
    ]);
    await page.reload();

    await page.getByRole("button", { name: "View rounds for Locals" }).click();
    const round = await openRound(page.getByRole("dialog", { name: "Locals" }), 2);
    await round.getByRole("button", { name: "Edit" }).click();

    const form = page.getByRole("dialog", { name: "Edit round 2" });
    await form.getByLabel("Round", { exact: true }).fill("1");
    await form.getByRole("button", { name: "Save round" }).click();
    await expect(form.getByText("Round 1 is already logged for this event.")).toBeVisible();

    const [event] = await db.events();
    expect(event.roundLog.map((r) => r.roundNum)).toEqual([1, 2]);
  });

  test("deletes a round", async ({ signedInPage: page, db }) => {
    await db.reset([
      {
        eventName: "Locals",
        eventDateTime: EVENT_DATE,
        roundLog: [
          { roundNum: 1, roundResult: true, opponentsName: "Mai" },
          { roundNum: 2, roundResult: false, opponentsName: "Bakura" },
        ],
      },
    ]);
    await page.reload();

    await page.getByRole("button", { name: "View rounds for Locals" }).click();
    const rounds = page.getByRole("dialog", { name: "Locals" });
    const round = await openRound(rounds, 2);
    await round.getByRole("button", { name: "Delete" }).click();

    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toContainText("Delete round 2?");
    await expect(confirm).toContainText("Round 2 vs Bakura will be permanently deleted.");
    await confirm.getByRole("button", { name: "Delete" }).click();
    await expect(confirm).toBeHidden();

    await expect(rounds).toContainText("1 round · Record 1-0");
    await expect(rounds.locator('[data-slot="accordion-trigger"]')).toHaveText([/Round 1\s*W\s*vs Mai/]);
    await page.keyboard.press("Escape");
    await expect(eventCard(page, "Locals")).toContainText("Record: 1-0");

    const [event] = await db.events();
    expect(event.roundLog.map((r) => r.opponentsName)).toEqual(["Mai"]);
  });
});
