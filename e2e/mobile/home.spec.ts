import { expect, localDateTime, test } from "../support/fixtures";
import { eventCard } from "../support/ui";

test.describe("mobile quick actions", () => {
  test("round actions are disabled until an event exists", async ({ signedInPage: page }) => {
    const nav = page.getByRole("navigation", { name: "Quick actions" });
    await expect(nav.getByRole("link", { name: "View Event Log" })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Create Event" })).toBeEnabled();
    await expect(nav.getByRole("button", { name: "Report a Bug" })).toBeEnabled();
    await expect(nav.getByRole("button", { name: "Suggest a Feature" })).toBeEnabled();
    await expect(nav.getByRole("button", { name: "Add Round to Latest Event" })).toBeDisabled();
    await expect(nav.getByRole("button", { name: "Edit Round" })).toBeDisabled();
    await expect(nav.getByText("Create an event first to start logging rounds.")).toBeVisible();

    // The desktop list and form aren't shown at this width.
    await expect(page.getByRole("heading", { name: "My events" })).toBeHidden();
  });

  test("creates an event from the dialog", async ({ signedInPage: page, db }) => {
    await page.getByRole("button", { name: "Create Event" }).click();
    const dialog = page.getByRole("dialog", { name: "New event" });
    await dialog.getByLabel("Event name").fill("Sunday Locals");
    await dialog.getByLabel("Format").selectOption("Edison");
    await dialog.getByLabel("Date & time").fill(localDateTime(new Date(2026, 10, 15, 13, 0)));
    await dialog.getByRole("button", { name: "Add event" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText("Event created")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Round to Latest Event" })).toBeEnabled();
    await expect(page.getByText("Create an event first to start logging rounds.")).toBeHidden();

    const [stored] = await db.events();
    expect(stored).toMatchObject({ eventName: "Sunday Locals", eventFormat: "Edison" });
  });

  test("opens the bug report dialog without submitting an empty report", async ({ signedInPage: page }) => {
    await page.getByRole("button", { name: "Report a Bug" }).click();
    const dialog = page.getByRole("dialog", { name: "Report a bug" });
    await expect(dialog.getByLabel("Title")).toBeVisible();
    await expect(dialog.getByLabel("What happened?")).toBeVisible();

    // Required fields stop the browser from submitting (which would file a GitHub issue).
    await dialog.getByRole("button", { name: "Submit report" }).click();
    expect(await dialog.getByLabel("Title").evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("opens the feature suggestion dialog without submitting an empty suggestion", async ({
    signedInPage: page,
  }) => {
    await page.getByRole("button", { name: "Suggest a Feature" }).click();
    const dialog = page.getByRole("dialog", { name: "Suggest a feature" });
    await expect(dialog.getByLabel("Title")).toBeVisible();
    await expect(dialog.getByLabel("What would you like?")).toBeVisible();

    await dialog.getByRole("button", { name: "Submit suggestion" }).click();
    expect(await dialog.getByLabel("Title").evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});

test.describe("event log page", () => {
  test("shows an empty state", async ({ signedInPage: page }) => {
    await page.getByRole("link", { name: "View Event Log" }).click();
    await expect(page).toHaveURL(/\/events$/);
    await expect(page.getByRole("heading", { name: "Event log" })).toBeVisible();
    await expect(page.getByText("No events yet.", { exact: true })).toBeVisible();
  });

  test("shows the 10 most recent events and links back home", async ({ signedInPage: page, db }) => {
    await db.reset(
      Array.from({ length: 12 }, (_, i) => ({
        eventName: `Event ${String(i + 1).padStart(2, "0")}`,
        eventDateTime: new Date(Date.UTC(2026, 0, i + 1, 18)),
      })),
    );
    await page.goto("/events");

    await expect(page.getByText("Your 10 most recent events")).toBeVisible();
    const titles = page.locator('[data-slot="card-title"]');
    await expect(titles).toHaveCount(10);
    await expect(titles.first()).toHaveText("Event 12");
    await expect(titles.last()).toHaveText("Event 03");
    await expect(eventCard(page, "Event 02")).toHaveCount(0);

    await page.getByRole("link", { name: "Back to home" }).click();
    await expect(page.getByRole("navigation", { name: "Quick actions" })).toBeVisible();
  });

  test("deletes an event from the log and shows a toast", async ({ signedInPage: page, db }) => {
    await db.reset([{ eventName: "Old event", eventDateTime: new Date("2026-02-01T18:00:00Z") }]);
    await page.goto("/events");

    await eventCard(page, "Old event").getByRole("button", { name: "Delete" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText("Event deleted")).toBeVisible();
    await expect(page.getByText("No events yet.", { exact: true })).toBeVisible();
    expect(await db.events()).toHaveLength(0);
  });
});
