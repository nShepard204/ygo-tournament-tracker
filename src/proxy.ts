import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  // Clerk calls this itself; it authenticates via the Svix signature instead.
  "/api/webhooks(.*)",
]);

// Optimistic redirect only. Server Actions and route handlers must still
// check auth() themselves (see src/lib/dal.ts).
export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    // Clerk's Frontend API proxy. With production keys on *.vercel.app, Clerk
    // auto-proxies its scripts (e.g. /__clerk/npm/.../clerk.browser.js) through
    // the app; the static-file rule above would otherwise skip those .js paths.
    "/__clerk/(.*)",
  ],
};
