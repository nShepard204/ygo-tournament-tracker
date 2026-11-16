import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

test.describe("signed out", () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  test("home page shows the landing message and auth buttons", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Track your Yu-Gi-Oh! tournaments" }),
    ).toBeVisible();
    await expect(page.getByText("Sign in to log events, decks, and results.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign up" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "My events" })).toHaveCount(0);
  });

  test("the event log redirects to sign-in", async ({ page }) => {
    await page.goto("/events");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("the sign-in page renders Clerk's sign-in form", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
  });
});
