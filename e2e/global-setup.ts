import { createClerkClient } from "@clerk/backend";
import { clerkSetup } from "@clerk/testing/playwright";

// Clerk's "+clerk_test" addresses never receive real email, so this account is
// safe to create in the dev instance.
const DEFAULT_TEST_EMAIL = "e2e+clerk_test@example.com";

export default async function globalSetup() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const secretKey = process.env.CLERK_SECRET_KEY ?? "";
  if (!publishableKey.startsWith("pk_test_") || !secretKey.startsWith("sk_test_")) {
    throw new Error(
      "E2E tests must run against a Clerk *development* instance (pk_test_/sk_test_ keys in .env.local).",
    );
  }
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set in .env.local.");

  // Fetches a testing token so Clerk's bot protection lets Playwright through.
  await clerkSetup();

  const email = process.env.E2E_CLERK_USER_EMAIL ?? DEFAULT_TEST_EMAIL;
  const clerk = createClerkClient({ secretKey });
  const { data: existing } = await clerk.users.getUserList({ emailAddress: [email] });
  const user =
    existing[0] ??
    (await clerk.users.createUser({
      emailAddress: [email],
      firstName: "E2E",
      lastName: "Tester",
      skipPasswordRequirement: true,
    }));

  // Values set on process.env here are visible to every test worker.
  process.env.E2E_CLERK_USER_EMAIL = email;
  process.env.E2E_CLERK_USER_ID = user.id;
}
