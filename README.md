This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## End-to-end tests

The [Playwright](https://playwright.dev) suite in `e2e/` drives the real app in Chromium at desktop and mobile (Pixel 7) sizes.

```bash
npx playwright install chromium   # once
npm run test:e2e                  # run everything
npm run test:e2e:ui               # interactive runner
npm run test:e2e:report           # open the last HTML report
```

- **Server:** reuses the dev server on port 3000, or starts `npm run dev` if none is running.
- **Config:** reads `.env.local`, which must hold Clerk **development** keys (`pk_test_`/`sk_test_`) and `MONGODB_URI`. Setup refuses to run against production Clerk keys.
- **Test user:** signs in as `e2e+clerk_test@example.com` (override with `E2E_CLERK_USER_EMAIL`), creating that user in the Clerk dev instance the first time.
- **Data:** each test resets that user's document in the `dev` collection, so tests run one at a time. No other user's data is touched.
- **Layouts:** `e2e/desktop/` covers the home page list and form plus the rounds popup; `e2e/mobile/` covers quick actions, adding and editing rounds, game results, and the event log.
