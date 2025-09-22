import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { UserSettings } from "@/lib/models/UserSettings";

export const runtime = "nodejs";

export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const doc = await UserSettings.findOne({ userId }).lean();
    return NextResponse.json({ settings: doc ?? null });
}

export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const body = await req.json();
    const doc = await UserSettings.findOneAndUpdate(
        { userId },
        { $set: body },
        { upsert: true, new: true }
    );
    return NextResponse.json({ settings: doc });
}
