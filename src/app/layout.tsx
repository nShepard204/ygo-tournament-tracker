import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YGO Tournament Tracker",
  description: "Track your Yu-Gi-Oh! tournaments and results",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <header className="flex h-14 items-center justify-between border-b px-4 sm:px-6">
            <Link href="/" className="font-semibold">
              YGO Tournament Tracker
            </Link>
            {/* Reads the session at request time, so it streams in behind a boundary */}
            <Suspense fallback={<div className="h-8 w-8" />}>
              <div className="flex items-center gap-2">
                <Show when="signed-out">
                  <SignInButton>
                    <Button variant="ghost" size="sm">Sign in</Button>
                  </SignInButton>
                  <SignUpButton>
                    <Button size="sm">Sign up</Button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <UserButton />
                </Show>
              </div>
            </Suspense>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
