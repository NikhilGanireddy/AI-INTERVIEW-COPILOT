import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import MeetingClient from "./meeting-client";
import { getOrCreateSubscription } from "@/lib/subscription";

export default async function MeetingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const subscription = await getOrCreateSubscription(userId);
  if (subscription.balanceMinutes <= 0) {
    redirect("/?reason=credits#pricing");
  }

  return (
    <div className="flex h-full flex-col overflow-hidden" data-animate="stagger">
      <div className="flex-1 overflow-hidden" data-animate-child>
        <div className="h-full rounded-xl  shadow-sm bg-white/10 p-4 text-white/80 backdrop-blur">
          <MeetingClient initialMinutes={subscription.balanceMinutes} />
        </div>
      </div>
    </div>
  );
}
