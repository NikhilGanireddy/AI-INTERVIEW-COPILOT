import { connectDB } from "@/lib/db";
import { UserSettings } from "@/lib/models/UserSettings";
import type { HydratedDocument } from "mongoose";

const MINUTES_PER_HOUR = 60;
export const DEFAULT_FREE_MINUTES = 5;

export type SubscriptionState = {
    planId: string;
    balanceMinutes: number;
    totalMinutesGranted: number;
    totalMinutesConsumed: number;
    lastPurchaseAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
};

export type SubscriptionSummary = {
    planId: string;
    balanceMinutes: number;
    balanceHours: number;
    totalMinutesGranted: number;
    totalMinutesConsumed: number;
    lastPurchaseAt: string | null;
    createdAt: string;
    updatedAt: string;
};

type UserSettingsDocument = HydratedDocument<{
    userId: string;
    subscription?: SubscriptionState;
}>;

export type SubscriptionPlan = {
    id: string;
    name: string;
    price: number;
    baseHours: number;
    bonusHours: number;
    description: string;
    benefits: string[];
    highlight?: boolean;
    badge?: string;
};

const now = () => new Date();

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
    basic: {
        id: "basic",
        name: "Basic",
        price: 22.99,
        baseHours: 3,
        bonusHours: 0,
        description: "Locked-in prep for a single onsite loop or panel.",
        benefits: [
            "3 total interview hours to schedule anytime",
            "Question banks tailored to FAANG & startup roles",
            "Downloadable feedback summaries",
        ],
    },
    plus: {
        id: "plus",
        name: "Plus",
        price: 45.99,
        baseHours: 6,
        bonusHours: 2,
        description: "Stay sharp across an entire interview cycle.",
        benefits: [
            "8 total interview hours with reusable scenarios",
            "Unlimited behavioral + technical prep flows",
            "Progress tracking across competencies",
        ],
        highlight: true,
        badge: "Most popular",
    },
    advanced: {
        id: "advanced",
        name: "Advanced",
        price: 65.99,
        baseHours: 9,
        bonusHours: 4,
        description: "Deep practice for power users, teams, and coaches.",
        benefits: [
            "13 total interview hours with shareable sessions",
            "Invite collaborators to review transcripts",
            "Export-ready reports for mentors or managers",
        ],
    },
};

function createDefaultSubscription(): SubscriptionState {
    const timestamp = now();
    return {
        planId: "free",
        balanceMinutes: DEFAULT_FREE_MINUTES,
        totalMinutesGranted: DEFAULT_FREE_MINUTES,
        totalMinutesConsumed: 0,
        lastPurchaseAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
    };
}

function minutesToHours(minutes: number) {
    return minutes / MINUTES_PER_HOUR;
}

function sanitizeSubscription(state: SubscriptionState): SubscriptionSummary {
    return {
        planId: state.planId ?? "free",
        balanceMinutes: Math.max(0, state.balanceMinutes ?? 0),
        balanceHours: Number((minutesToHours(state.balanceMinutes ?? 0)).toFixed(2)),
        totalMinutesGranted: Math.max(state.totalMinutesGranted ?? 0, DEFAULT_FREE_MINUTES),
        totalMinutesConsumed: Math.max(state.totalMinutesConsumed ?? 0, 0),
        lastPurchaseAt: state.lastPurchaseAt ? state.lastPurchaseAt.toISOString() : null,
        createdAt: (state.createdAt ?? now()).toISOString(),
        updatedAt: (state.updatedAt ?? now()).toISOString(),
    };
}

async function fetchSettings(userId: string): Promise<UserSettingsDocument | null> {
    await connectDB();
    return UserSettings.findOne({ userId }) as Promise<UserSettingsDocument | null>;
}

export async function getOrCreateSubscription(userId: string): Promise<SubscriptionSummary> {
    let doc = await fetchSettings(userId);

    if (!doc) {
        const defaults = createDefaultSubscription();
        doc = (await UserSettings.create({ userId, subscription: defaults })) as unknown as UserSettingsDocument;
        return sanitizeSubscription(defaults);
    }

    const subscription = doc.subscription;
    let needsSave = false;
    let current: SubscriptionState;

    if (!subscription || typeof subscription.balanceMinutes !== "number") {
        current = createDefaultSubscription();
        doc.set("subscription", current);
        needsSave = true;
    } else {
        const normalisedBalance = Math.max(subscription.balanceMinutes, 0);
        current = {
            ...createDefaultSubscription(),
            ...subscription,
            balanceMinutes: normalisedBalance,
            totalMinutesGranted:
                typeof subscription.totalMinutesGranted === "number"
                    ? Math.max(subscription.totalMinutesGranted, DEFAULT_FREE_MINUTES)
                    : Math.max(subscription.balanceMinutes, DEFAULT_FREE_MINUTES),
            totalMinutesConsumed:
                typeof subscription.totalMinutesConsumed === "number"
                    ? subscription.totalMinutesConsumed
                    : 0,
            planId: subscription.planId ?? "free",
            lastPurchaseAt: subscription.lastPurchaseAt ?? null,
            createdAt: subscription.createdAt ?? subscription.updatedAt ?? now(),
            updatedAt: now(),
        };

        if (
            subscription.planId == null ||
            typeof subscription.totalMinutesGranted !== "number" ||
            typeof subscription.totalMinutesConsumed !== "number" ||
            normalisedBalance !== subscription.balanceMinutes
        ) {
            needsSave = true;
        }

        if (current.planId === "free" && current.balanceMinutes < DEFAULT_FREE_MINUTES) {
            const delta = DEFAULT_FREE_MINUTES - current.balanceMinutes;
            current.balanceMinutes += delta;
            current.totalMinutesGranted += delta;
            needsSave = true;
        }

        doc.set("subscription", current);
    }

    if (needsSave) {
        doc.markModified("subscription");
        await doc.save();
    }

    return sanitizeSubscription(current);
}

export function totalMinutesForPlan(plan: SubscriptionPlan) {
    return Math.round((plan.baseHours + plan.bonusHours) * MINUTES_PER_HOUR);
}

export function totalMinutesForPlanId(planId: string): number | null {
    const plan = getPlanById(planId);
    return plan ? totalMinutesForPlan(plan) : null;
}

export async function purchasePlan(userId: string, planId: string): Promise<SubscriptionSummary> {
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) {
        throw new Error("Unknown subscription plan");
    }

    const minutesToAdd = totalMinutesForPlan(plan);
    return addCredits(userId, minutesToAdd, { planId });
}

export async function addCredits(
    userId: string,
    minutes: number,
    options: { planId?: string; reason?: string } = {}
): Promise<SubscriptionSummary> {
    if (!Number.isFinite(minutes) || minutes <= 0) {
        throw new Error("Minutes to add must be a positive number");
    }

    let doc = await fetchSettings(userId);
    const nowStamp = now();

    if (!doc) {
        const defaults = createDefaultSubscription();
        defaults.balanceMinutes += minutes;
        defaults.totalMinutesGranted += minutes;
        if (options.planId) defaults.planId = options.planId;
        defaults.lastPurchaseAt = options.planId ? nowStamp : null;
        defaults.updatedAt = nowStamp;
        doc = (await UserSettings.create({ userId, subscription: defaults })) as unknown as UserSettingsDocument;
        return sanitizeSubscription(defaults);
    }

    const subscription = doc.subscription;
    let current: SubscriptionState;

    if (!subscription || typeof subscription.balanceMinutes !== "number") {
        current = createDefaultSubscription();
    } else {
        current = {
            ...createDefaultSubscription(),
            ...subscription,
        };
    }

    current.balanceMinutes += minutes;
    current.totalMinutesGranted += minutes;
    current.updatedAt = nowStamp;
    if (options.planId) {
        current.planId = options.planId;
        current.lastPurchaseAt = nowStamp;
    }

    doc.set("subscription", current);
    doc.markModified("subscription");
    await doc.save();

    return sanitizeSubscription(current);
}

export async function consumeCredits(userId: string, minutes: number): Promise<SubscriptionSummary> {
    if (!Number.isFinite(minutes) || minutes <= 0) {
        throw new Error("Minutes to consume must be a positive number");
    }

    const doc = await fetchSettings(userId);
    if (!doc || !doc.subscription) {
        throw new Error("Subscription not initialized");
    }

    const sub = doc.subscription as SubscriptionState;
    const current = {
        ...createDefaultSubscription(),
        ...sub,
    };

    if (current.balanceMinutes < minutes) {
        throw new Error("Insufficient credits");
    }

    current.balanceMinutes -= minutes;
    current.totalMinutesConsumed += minutes;
    current.updatedAt = now();

    doc.set("subscription", current);
    doc.markModified("subscription");
    await doc.save();

    return sanitizeSubscription(current);
}

export function getPlanById(planId: string): SubscriptionPlan | null {
    return SUBSCRIPTION_PLANS[planId] ?? null;
}

export function listPaidPlans(): SubscriptionPlan[] {
    return Object.values(SUBSCRIPTION_PLANS);
}
