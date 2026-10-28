import type { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

// Keeps the users collection in sync with Clerk.
// Configure in Clerk Dashboard → Webhooks: endpoint {APP_URL}/api/webhooks/clerk,
// events user.created, user.updated, user.deleted. Signing secret goes in
// CLERK_WEBHOOK_SIGNING_SECRET.
export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    console.error("Clerk webhook verification failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  await connectDB();

  switch (evt.type) {
    case "user.created":
    case "user.updated": {
      const u = evt.data;
      const primaryEmail =
        u.email_addresses.find((e) => e.id === u.primary_email_address_id)?.email_address ??
        u.email_addresses[0]?.email_address ??
        "";

      await User.updateOne(
        { clerkId: u.id },
        {
          $set: {
            email: primaryEmail,
            username: u.username ?? undefined,
            displayName: [u.first_name, u.last_name].filter(Boolean).join(" ") || undefined,
            imageUrl: u.image_url,
          },
          $setOnInsert: { clerkId: u.id },
        },
        { upsert: true },
      );
      break;
    }
    case "user.deleted": {
      if (evt.data.id) await User.deleteOne({ clerkId: evt.data.id });
      break;
    }
  }

  return new Response("OK", { status: 200 });
}
