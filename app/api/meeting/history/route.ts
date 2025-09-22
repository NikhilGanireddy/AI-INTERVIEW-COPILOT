import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import { MeetingTurn } from "@/lib/models/MeetingTurn";
import { Types } from "mongoose";

export const runtime = "nodejs";

type MeetingTurnRaw = {
  _id: unknown;
  sessionId: string;
  profileId?: string | null;
  order?: number;
  question: string;
  answer?: string;
  askedAt?: Date;
  answeredAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

function sanitize(turn: MeetingTurnRaw) {
  return {
    id: String(turn._id),
    sessionId: turn.sessionId,
    profileId: turn.profileId ? String(turn.profileId) : null,
    order: typeof turn.order === "number" ? turn.order : null,
    question: turn.question,
    answer: turn.answer ?? "",
    askedAt: turn.askedAt,
    answeredAt: turn.answeredAt ?? null,
    createdAt: turn.createdAt,
    updatedAt: turn.updatedAt,
  };
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const profileId = searchParams.get("profileId");
  const limitParam = Number(searchParams.get("limit") || "50");
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 50;

  await connectDB();

  const query: Record<string, unknown> = { userId };
  if (sessionId) query.sessionId = sessionId;
  if (profileId) query.profileId = profileId;

  const docs = (await MeetingTurn.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()) as unknown as MeetingTurnRaw[];

  return NextResponse.json({
    history: docs.reverse().map(sanitize),
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    question?: string;
    answer?: string;
    sessionId?: string;
    profileId?: string;
    order?: number;
    askedAt?: string;
    answeredAt?: string;
  };

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }

  const sessionId = typeof body.sessionId === "string" && body.sessionId.trim().length
    ? body.sessionId.trim()
    : `${userId}-${Date.now()}`;

  const profileId = typeof body.profileId === "string" && body.profileId.trim().length
    ? body.profileId.trim()
    : "";

  if (!profileId) {
    return NextResponse.json({ error: "profileId is required" }, { status: 400 });
  }

  const askedAt = body.askedAt ? new Date(body.askedAt) : new Date();
  const answeredAt = body.answeredAt ? new Date(body.answeredAt) : undefined;

  await connectDB();
  const doc = await MeetingTurn.create({
    userId,
    sessionId,
    profileId,
    order: typeof body.order === "number" ? body.order : undefined,
    question,
    answer: typeof body.answer === "string" ? body.answer : "",
    askedAt,
    answeredAt,
  });

  return NextResponse.json({ ok: true, turn: sanitize(doc.toObject() as unknown as MeetingTurnRaw) });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    answer?: string;
    answeredAt?: string;
  };

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id || !Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Valid id is required" }, { status: 400 });
  }

  const answer = typeof body.answer === "string" ? body.answer : "";
  const answeredAt = body.answeredAt ? new Date(body.answeredAt) : new Date();

  await connectDB();
  const doc = (await MeetingTurn.findOneAndUpdate(
    { _id: id, userId },
    { answer, answeredAt },
    { new: true }
  ).lean()) as MeetingTurnRaw | null;

  if (!doc) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, turn: sanitize(doc) });
}
