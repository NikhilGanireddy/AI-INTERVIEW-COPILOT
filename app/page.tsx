import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Welcome</h1>

        <SignedOut>
          <p className="text-muted-foreground">
            Please sign in to access your dashboard.
          </p>
        </SignedOut>

        <SignedIn>
          <Link href="/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
        </SignedIn>
      </div>
  );
}