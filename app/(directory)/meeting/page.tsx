import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import MeetingClient from "./meeting-client";

export default async function MeetingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="flex h-full flex-col overflow-hidden" data-animate="stagger">
      <div className="flex-1 overflow-hidden" data-animate-child>
        <div className="h-full rounded-xl border p-5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-white/5">
          <MeetingClient />
        </div>
      </div>
    </div>
  );
}
