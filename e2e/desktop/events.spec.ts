import { expect, localDateTime, test } from "../support/fixtures";
import { eventCard } from "../support/ui";

test.describe("home page (desktop)", () => {
  test("shows the empty state for a new account", async ({ signedInPage: page }) => {
    await expect(page.getByRole("heading", { name: "My events" })).toBeVisible();
    await expect(page.getByText("No events yet. Add your first one.")).toBeVisible();
    await expect(page.getByText("New event", { exact: true })).toBeVisible();
  });

  test("creates an event with every field filled in", async ({ signedInPage: page, db }) => {
    const when = new Date(2026, 10, 14, 19, 0);

    await page.getByLabel("Event name").fill("Friday Locals");
    await page.getByLabel("Format").selectOption("Genesys");
    await page.getByLabel("Players").fill("24");
    await page.getByLabel("Date & time").fill(localDateTime(when));
    await page.getByLabel("Location").fill("Card Castle");
    await page.getByLabel("Deck played").fill("Snake-Eye");
    await page.getByLabel("Notes").fill("Bring sleeves");
    await page.getByLabel(/Premier event/).check();
    await page.getByRole("button", { name: "Add event" }).click();

    const card = eventCard(page, "Friday Locals");
    await expect(card).toBeVisible();
    await expect(card.getByText("Premier", { exact: true })).toBeVisible();
    await expect(card).toContainText("Genesys ·");
    await expect(card).toContainText("Card Castle");
    await expect(card).toContainText("Deck: Snake-Eye · Players: 24 · Record: 0-0");
    await expect(card).toContainText("Bring sleeves");
    await expect(page.getByText("No events yet.")).toHaveCount(0);

    // The form clears for the next event.
    await expect(page.getByLabel("Event name")).toHaveValue("");

    const [stored] = await db.events();
    expect(stored).toMatchObject({
      eventName: "Friday Locals",
      eventFormat: "Genesys",
      playerCount: 24,
      eventLocation: "Card Castle",
      deck: "Snake-Eye",
      eventNotes: "Bring sleeves",
      isPremierEvent: true,
      roundLog: [],
    });
    // The browser converts the local time to the right instant before saving.
    expect(stored.eventDateTime.getTime()).toBe(when.getTime());
  });

  test("creates an event with only the required fields", async ({ signedInPage: page, db }) => {
    await page.getByLabel("Event name").fill("Quick event");
    await page.getByLabel("Date & time").fill(localDateTime(new Date(2026, 0, 2, 18, 30)));
    await page.getByRole("button", { name: "Add event" }).click();

    const card = eventCard(page, "Quick event");
    await expect(card).toContainText("Advanced ·");
    // Blank deck and player count show as unknown.
    await expect(card).toContainText("Deck: — · Players: — · Record: 0-0");
    await expect(card.getByText("Premier", { exact: true })).toHaveCount(0);

    const [stored] = await db.events();
    expect(stored).toMatchObject({ eventName: "Quick event", eventFormat: "Advanced", playerCount: 0 });
  });

  test("won't submit without an event name or date", async ({ signedInPage: page, db }) => {
    const name = page.getByLabel("Event name");
    const date = page.getByLabel("Date & time");

    await page.getByRole("button", { name: "Add event" }).click();
    expect(await name.evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);

    await name.fill("No date yet");
    await page.getByRole("button", { name: "Add event" }).click();
    expect(await date.evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);

    await expect(page.getByText("No events yet. Add your first one.")).toBeVisible();
    expect(await db.events()).toHaveLength(0);
  });

  test("rejects a name that is only spaces", async ({ signedInPage: page, db }) => {
    await page.getByLabel("Event name").fill("   ");
    await page.getByLabel("Date & time").fill(localDateTime(new Date(2026, 0, 2, 18, 30)));
    await page.getByRole("button", { name: "Add event" }).click();

    await expect(page.getByText("Event name is required")).toBeVisible();
    expect(await db.events()).toHaveLength(0);
  });

  test("lists events newest date first", async ({ signedInPage: page, db }) => {
    await db.reset([
      { eventName: "Middle", eventDateTime: new Date("2026-05-01T18:00:00Z") },
      { eventName: "Newest", eventDateTime: new Date("2026-09-01T18:00:00Z") },
      { eventName: "Oldest", eventDateTime: new Date("2026-01-01T18:00:00Z") },
    ]);
    await page.reload();

    await expect(page.locator('[data-slot="card-title"]').filter({ hasNotText: "New event" })).toHaveText([
      "Newest",
      "Middle",
      "Oldest",
    ]);
  });

  test("shows each event's win-loss record", async ({ signedInPage: page, db }) => {
    await db.reset([
      {
        eventName: "Regional",
        eventDateTime: new Date("2026-06-01T15:00:00Z"),
        roundLog: [
          { roundNum: 1, roundResult: true },
          { roundNum: 2, roundResult: false },
          { roundNum: 3, roundResult: true },
          { roundNum: 4 }, // not recorded yet; counts toward neither
        ],
      },
    ]);
    await page.reload();

    await expect(eventCard(page, "Regional")).toContainText("Record: 2-1");
  });

  test("edits an event", async ({ signedInPage: page, db }) => {
    await db.reset([
      {
        eventName: "Old name",
        eventDateTime: new Date(2026, 2, 3, 19, 0),
        eventFormat: "Edison",
        deck: "Tearlaments",
        playerCount: 16,
      },
    ]);
    await page.reload();

    await eventCard(page, "Old name").getByRole("button", { name: "Edit" }).click();
    const dialog = page.getByRole("dialog", { name: "Edit event" });
    await expect(dialog.getByLabel("Event name")).toHaveValue("Old name");
    await expect(dialog.getByLabel("Format")).toHaveValue("Edison");
    await expect(dialog.getByLabel("Players")).toHaveValue("16");
    await expect(dialog.getByLabel("Deck played")).toHaveValue("Tearlaments");
    await expect(dialog.getByLabel("Date & time")).toHaveValue("2026-03-03T19:00");

    await dialog.getByLabel("Event name").fill("New name");
    await dialog.getByLabel("Format").selectOption("GOAT");
    await dialog.getByLabel(/Premier event/).check();
    await dialog.getByRole("button", { name: "Save changes" }).click();

    await expect(dialog).toBeHidden();
    const card = eventCard(page, "New name");
    await expect(card).toContainText("GOAT ·");
    await expect(card.getByText("Premier", { exact: true })).toBeVisible();
    await expect(eventCard(page, "Old name")).toHaveCount(0);

    const [stored] = await db.events();
    expect(stored).toMatchObject({ eventName: "New name", eventFormat: "GOAT", isPremierEvent: true });
  });

  test("cancelling a delete keeps the event", async ({ signedInPage: page, db }) => {
    await db.reset([{ eventName: "Keep me", eventDateTime: new Date("2026-04-01T18:00:00Z") }]);
    await page.reload();

    await eventCard(page, "Keep me").getByRole("button", { name: "Delete" }).click();
    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toContainText("Delete this event?");
    await expect(confirm).toContainText("Keep me will be permanently deleted.");
    await confirm.getByRole("button", { name: "Cancel" }).click();

    await expect(confirm).toBeHidden();
    await expect(eventCard(page, "Keep me")).toBeVisible();
    expect(await db.events()).toHaveLength(1);
  });

  test("deletes an event and its rounds", async ({ signedInPage: page, db }) => {
    await db.reset([
      { eventName: "Stays", eventDateTime: new Date("2026-04-01T18:00:00Z") },
      {
        eventName: "Goes",
        eventDateTime: new Date("2026-04-02T18:00:00Z"),
        roundLog: [{ roundNum: 1 }, { roundNum: 2 }],
      },
    ]);
    await page.reload();

    await eventCard(page, "Goes").getByRole("button", { name: "Delete" }).click();
    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toContainText("Goes and its 2 rounds will be permanently deleted.");
    await confirm.getByRole("button", { name: "Delete" }).click();

    await expect(confirm).toBeHidden();
    await expect(eventCard(page, "Goes")).toHaveCount(0);
    await expect(eventCard(page, "Stays")).toBeVisible();
    expect((await db.events()).map((e) => e.eventName)).toEqual(["Stays"]);
  });
});

test.describe("user menu", () => {
  test("shows the account and signs out", async ({ signedInPage: page, db }) => {
    await page.getByRole("button", { name: "Open user menu" }).click();
    await expect(page.getByRole("menu")).toContainText(db.email);

    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(
      page.getByRole("heading", { name: "Track your Yu-Gi-Oh! tournaments" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });
});
