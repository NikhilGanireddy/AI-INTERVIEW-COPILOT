import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
    addCredits,
    consumeCredits,
    getOrCreateSubscription,
    listPaidPlans,
    purchasePlan,
    totalMinutesForPlan,
} from "@/lib/subscription";

export const runtime = "nodejs";

function asJson(data: unknown, init?: { status?: number }) {
    return NextResponse.json(data, { status: init?.status ?? 200 });
}

function error(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status });
}

function serializePlans() {
    return listPaidPlans().map((plan) => ({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        baseHours: plan.baseHours,
        bonusHours: plan.bonusHours,
        totalHours: plan.baseHours + plan.bonusHours,
        totalMinutes: totalMinutesForPlan(plan),
        description: plan.description,
        benefits: plan.benefits,
        highlight: Boolean(plan.highlight),
        badge: plan.badge ?? null,
    }));
}

export async function GET() {
    const { userId } = await auth();
    if (!userId) return error("Unauthorized", 401);

    const subscription = await getOrCreateSubscription(userId);
    return asJson({ subscription, plans: serializePlans() });
}

export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) return error("Unauthorized", 401);

    const body = await req.json().catch(() => ({}));

    const planId = typeof body.planId === "string" ? body.planId.trim() : "";
    const minutes = Number(body.minutes);

    try {
        if (planId) {
            const subscription = await purchasePlan(userId, planId);
            revalidatePath("/");
            revalidatePath("/dashboard");
            return asJson({ subscription, planId });
        }

        if (Number.isFinite(minutes) && minutes > 0) {
            const subscription = await addCredits(userId, minutes, { reason: body.reason });
            revalidatePath("/");
            revalidatePath("/dashboard");
            return asJson({ subscription, minutes });
        }

        return error("Provide a valid planId or minutes payload", 400);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to update subscription";
        return error(message, 400);
    }
}

export async function PATCH(req: Request) {
    const { userId } = await auth();
    if (!userId) return error("Unauthorized", 401);

    const body = await req.json().catch(() => ({}));
    const minutes = Number(body.minutes);
    if (!Number.isFinite(minutes) || minutes <= 0) {
        return error("Minutes to consume must be a positive number", 400);
    }

    try {
        const subscription = await consumeCredits(userId, minutes);
        revalidatePath("/");
        revalidatePath("/dashboard");
        return asJson({ subscription, minutes });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to consume credits";
        return error(message, 400);
    }
}
