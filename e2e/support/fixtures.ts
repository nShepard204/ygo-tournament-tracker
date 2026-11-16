import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { test as base, expect, type Page } from "@playwright/test";
import { TestDb } from "./db";

type Fixtures = {
  /** Direct access to the E2E user's Mongo document, emptied before each test. */
  db: TestDb;
  /** A page signed in as the E2E user, opened on the home page. */
  signedInPage: Page;
};

type WorkerFixtures = { workerDb: TestDb };

export const test = base.extend<Fixtures, WorkerFixtures>({
  workerDb: [
    async ({}, provide) => {
      const db = await TestDb.connect();
      await provide(db);
      await db.close();
    },
    { scope: "worker" },
  ],

  db: async ({ workerDb }, provide) => {
    await workerDb.reset();
    await provide(workerDb);
  },

  // Depends on `db` so the account is reset before the page first loads.
  signedInPage: async ({ page, db }, provide) => {
    await setupClerkTestingToken({ page });
    await page.goto("/");
    await clerk.signIn({ page, emailAddress: db.email });
    await page.goto("/");
    await provide(page);
  },
});

export { expect };

/** A datetime-local value, e.g. "2026-11-14T19:00". */
export function localDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
