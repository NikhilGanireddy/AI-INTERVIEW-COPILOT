import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import { InterviewCopilotProfile } from "@/lib/models/InterviewCopilotProfile";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB guard

type RawProfile = {
  _id: unknown;
  profileName: string;
  jobRole: string;
  projectDetails?: string;
  resume?: {
    mode?: string;
    text?: string;
    file?: {
      originalName?: string | null;
      mimeType?: string | null;
      size?: number | null;
      data?: Buffer | Uint8Array | null;
    } | null;
  } | null;
  jobDescription?: {
    mode?: string;
    text?: string;
    file?: {
      originalName?: string | null;
      mimeType?: string | null;
      size?: number | null;
      data?: Buffer | Uint8Array | null;
    } | null;
  } | null;
  createdAt?: Date;
  updatedAt?: Date;
};

function sanitizeProfile(doc: RawProfile) {
  return {
    id: String(doc._id),
    profileName: doc.profileName,
    jobRole: doc.jobRole,
    projectDetailsLength: doc.projectDetails?.length ?? 0,
    resume: {
      mode: doc.resume?.mode ?? null,
      hasFile: Boolean(doc.resume?.file?.data?.length),
      fileName: doc.resume?.file?.originalName ?? null,
      fileSize: doc.resume?.file?.size ?? null,
      textLength: doc.resume?.text?.length ?? 0,
    },
    jobDescription: {
      mode: doc.jobDescription?.mode ?? null,
      hasFile: Boolean(doc.jobDescription?.file?.data?.length),
      fileName: doc.jobDescription?.file?.originalName ?? null,
      fileSize: doc.jobDescription?.file?.size ?? null,
      textLength: doc.jobDescription?.text?.length ?? 0,
    },
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function buildProfileDetail(doc: RawProfile) {
  return {
    id: String(doc._id),
    profileName: doc.profileName,
    jobRole: doc.jobRole,
    projectDetails: doc.projectDetails ?? "",
    resume: {
      mode: doc.resume?.mode ?? null,
      text: doc.resume?.mode === "paste" ? (doc.resume?.text ?? "") : "",
      fileName: doc.resume?.file?.originalName ?? null,
      fileSize: doc.resume?.file?.size ?? null,
      mimeType: doc.resume?.file?.mimeType ?? null,
    },
    jobDescription: {
      mode: doc.jobDescription?.mode ?? null,
      text: doc.jobDescription?.mode === "paste" ? (doc.jobDescription?.text ?? "") : "",
      fileName: doc.jobDescription?.file?.originalName ?? null,
      fileSize: doc.jobDescription?.file?.size ?? null,
      mimeType: doc.jobDescription?.file?.mimeType ?? null,
    },
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function fileToBlob(file: File | null) {
  if (!file) return null;
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`File limit exceeded (${MAX_FILE_BYTES / (1024 * 1024)}MB max)`);
  }
  const arrayBuffer = await file.arrayBuffer();
  return {
    originalName: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    data: Buffer.from(arrayBuffer),
  };
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  await connectDB();
  if (id) {
    const doc = (await InterviewCopilotProfile.findOne({ _id: id, userId }).lean()) as
      | RawProfile
      | null;
    if (!doc) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    return NextResponse.json({ profile: buildProfileDetail(doc) });
  }

  const docs = (await InterviewCopilotProfile.find({ userId })
    .sort({ updatedAt: -1 })
    .limit(25)
    .lean()) as unknown as RawProfile[];

  return NextResponse.json({
    profiles: docs.map(sanitizeProfile),
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();

  const profileNameRaw = form.get("profileName");
  const jobRoleRaw = form.get("jobRole");

  const profileName = typeof profileNameRaw === "string" ? profileNameRaw.trim() : "";
  const jobRole = typeof jobRoleRaw === "string" ? jobRoleRaw.trim() : "";

  if (!profileName) {
    return NextResponse.json({ error: "Profile name is required" }, { status: 400 });
  }
  if (!jobRole) {
    return NextResponse.json({ error: "Job role is required" }, { status: 400 });
  }

  const resumeMode = (form.get("resumeMode") as string) === "paste" ? "paste" : "upload";
  const jobDescriptionMode = (form.get("jobDescriptionMode") as string) === "upload" ? "upload" : "paste";

  const resumeTextRaw = form.get("resumeText");
  const jobDescriptionTextRaw = form.get("jobDescriptionText");

  const resumeFile = form.get("resumeFile");
  const jobDescriptionFile = form.get("jobDescriptionFile");

  const projectDetails =
    typeof form.get("projectDetails") === "string"
      ? (form.get("projectDetails") as string).trim()
      : "";

  try {
    const resumeDoc = resumeMode === "upload"
      ? {
          mode: "upload" as const,
          file: await fileToBlob(resumeFile instanceof File ? resumeFile : null),
        }
      : {
          mode: "paste" as const,
          text: typeof resumeTextRaw === "string" ? resumeTextRaw.trim() : "",
        };

    if (resumeMode === "upload" && !resumeDoc.file) {
      return NextResponse.json({ error: "Resume file required" }, { status: 400 });
    }
    if (resumeMode === "paste" && !resumeDoc.text) {
      return NextResponse.json({ error: "Resume text required" }, { status: 400 });
    }

    const jobDescriptionDoc = jobDescriptionMode === "upload"
      ? {
          mode: "upload" as const,
          file: await fileToBlob(jobDescriptionFile instanceof File ? jobDescriptionFile : null),
        }
      : {
          mode: "paste" as const,
          text: typeof jobDescriptionTextRaw === "string" ? jobDescriptionTextRaw.trim() : "",
        };

    if (jobDescriptionMode === "upload" && !jobDescriptionDoc.file) {
      return NextResponse.json({ error: "Job description file required" }, { status: 400 });
    }
    if (jobDescriptionMode === "paste" && !jobDescriptionDoc.text) {
      return NextResponse.json({ error: "Job description text required" }, { status: 400 });
    }

    await connectDB();

    const doc = await InterviewCopilotProfile.create({
      userId,
      profileName,
      jobRole,
      resume: resumeDoc,
      jobDescription: jobDescriptionDoc,
      projectDetails,
    });

    return NextResponse.json({
      ok: true,
      profile: sanitizeProfile(doc.toObject() as unknown as RawProfile),
    });
  } catch (error) {
    console.error("Create copilot profile failed", error);
    return NextResponse.json(
      { error: "Unable to save profile", details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const body = (payload ?? {}) as { id?: unknown; profileName?: unknown };
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const profileName = typeof body.profileName === "string" ? body.profileName.trim() : "";

  if (!id) {
    return NextResponse.json({ error: "Profile id is required" }, { status: 400 });
  }
  if (!profileName) {
    return NextResponse.json({ error: "Profile name is required" }, { status: 400 });
  }

  try {
    await connectDB();
    const updated = await InterviewCopilotProfile.findOneAndUpdate(
      { _id: id, userId },
      { profileName },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, profile: sanitizeProfile(updated as unknown as RawProfile) });
  } catch (error) {
    console.error("Rename copilot profile failed", error);
    return NextResponse.json(
      { error: "Unable to update profile", details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const body = (payload ?? {}) as { id?: unknown };
  const id = typeof body.id === "string" ? body.id.trim() : "";

  if (!id) {
    return NextResponse.json({ error: "Profile id is required" }, { status: 400 });
  }

  try {
    await connectDB();
    const result = await InterviewCopilotProfile.deleteOne({ _id: id, userId });
    if (!result.deletedCount) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete copilot profile failed", error);
    return NextResponse.json(
      { error: "Unable to delete profile", details: (error as Error).message },
      { status: 500 }
    );
  }
}
