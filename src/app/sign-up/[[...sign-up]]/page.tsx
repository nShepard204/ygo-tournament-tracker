import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      {/* <SignUp> reads the URL at runtime, so it can't be in the static shell */}
      <Suspense>
        <SignUp />
      </Suspense>
    </main>
  );
}
