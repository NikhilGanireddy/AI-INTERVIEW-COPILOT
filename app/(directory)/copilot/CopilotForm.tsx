"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Stepper, { Step } from "@/components/ui/stepper";
import clsx from "clsx";

const resumeAccept = ".pdf,.doc,.docx,.txt";
const jobDescriptionAccept = ".pdf,.doc,.docx,.txt";

type UploadMode = "upload" | "paste";

type CopilotProfileSummary = {
  id: string;
  profileName: string;
  jobRole: string;
  resume: {
    mode: string | null;
    hasFile: boolean;
    fileName: string | null;
    fileSize: number | null;
    textLength: number;
  };
  jobDescription: {
    mode: string | null;
    hasFile: boolean;
    fileName: string | null;
    fileSize: number | null;
    textLength: number;
  };
  projectDetailsLength: number;
  createdAt?: string;
  updatedAt?: string;
};

type ProfilesGridProps = {
  profiles: CopilotProfileSummary[];
  pendingDeleteId: string | null;
  pendingRenameId: string | null;
  onDelete: (id: string) => Promise<boolean>;
  onRename: (id: string, nextName: string) => Promise<boolean>;
};

type ProfileTileProps = {
  profile: CopilotProfileSummary;
  pendingDeleteId: string | null;
  pendingRenameId: string | null;
  onDelete: (id: string) => Promise<boolean>;
  onRename: (id: string, nextName: string) => Promise<boolean>;
};

function ProfilesGrid({ profiles, pendingDeleteId, pendingRenameId, onDelete, onRename }: ProfilesGridProps) {
  if (!profiles.length) return null;

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {profiles.map((profile) => (
        <ProfileTile
          key={profile.id}
          profile={profile}
          pendingDeleteId={pendingDeleteId}
          pendingRenameId={pendingRenameId}
          onDelete={onDelete}
          onRename={onRename}
        />
      ))}
    </div>
  );
}

function ProfileTile({ profile, pendingDeleteId, pendingRenameId, onDelete, onRename }: ProfileTileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(profile.profileName);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setDraftName(profile.profileName);
  }, [profile.profileName]);

  const isDeleting = pendingDeleteId === profile.id;
  const isRenaming = pendingRenameId === profile.id;
  const isBusy = isDeleting || isRenaming;

  const resumeLabel = profile.resume.mode === "upload"
    ? profile.resume.fileName ?? "Uploaded file"
    : `${profile.resume.textLength} chars`;
  const jobLabel = profile.jobDescription.mode === "upload"
    ? profile.jobDescription.fileName ?? "Uploaded file"
    : `${profile.jobDescription.textLength} chars`;

  const handleStartEdit = () => {
    setIsEditing(true);
    setDraftName(profile.profileName);
    setLocalError(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setDraftName(profile.profileName);
    setLocalError(null);
  };

  const handleSave = async () => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      setLocalError("Enter a name before saving.");
      return;
    }
    if (trimmed === profile.profileName) {
      setIsEditing(false);
      setLocalError(null);
      return;
    }
    setLocalError(null);
    const ok = await onRename(profile.id, trimmed);
    if (ok) {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    await onDelete(profile.id);
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleSave();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      handleCancelEdit();
    }
  };

  return (
    <div className="flex flex-col justify-between gap-2 rounded-lg border border-border/70 bg-background/70 p-3 text-xs shadow-sm transition hover:border-primary/50">
      <div className="space-y-1">
        {isEditing ? (
          <div className="space-y-1">
            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={handleInputKeyDown}
              disabled={isBusy}
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Profile name"
            />
            {localError ? (
              <p className="text-[0.6rem] text-destructive">{localError}</p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-1">
            <div className="line-clamp-2 text-[0.75rem] font-semibold uppercase tracking-tight text-foreground">
              {profile.profileName}
            </div>
            <div className="line-clamp-2 text-[0.65rem] text-muted-foreground">{profile.jobRole}</div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[0.6rem] text-muted-foreground/80">
        <span className="truncate">Resume: {resumeLabel}</span>
        <span className="hidden h-1 w-1 rounded-full bg-border sm:inline" />
        <span className="truncate">Job: {jobLabel}</span>
      </div>

      <div className="flex items-center justify-between gap-2 text-[0.65rem]">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => void handleSave()}
              disabled={isBusy}
            >
              {isRenaming ? "Saving…" : "Save"}
            </Button>
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={isBusy}
              className="rounded px-2 py-1 text-[0.65rem] text-muted-foreground transition hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleStartEdit}
            disabled={isBusy}
            className="rounded px-2 py-1 text-[0.65rem] font-semibold text-primary transition hover:bg-primary/10"
          >
            Edit name
          </button>
        )}
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={isBusy}
          className="rounded px-2 py-1 text-[0.65rem] font-semibold text-destructive transition hover:bg-destructive/10"
        >
          {isDeleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}

export default function InterviewCopilotForm() {
  const [profileName, setProfileName] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [projectDetails, setProjectDetails] = useState("");

  const [resumeMode, setResumeMode] = useState<UploadMode>("upload");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");

  const [jobDescriptionMode, setJobDescriptionMode] = useState<UploadMode>("paste");
  const [jobDescriptionFile, setJobDescriptionFile] = useState<File | null>(null);
  const [jobDescriptionText, setJobDescriptionText] = useState("");

  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profiles, setProfiles] = useState<CopilotProfileSummary[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingRenameId, setPendingRenameId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    let cancelled = false;
    async function fetchProfiles() {
      try {
        setIsLoadingProfiles(true);
        const res = await fetch("/api/copilot/profiles");
        if (!res.ok) {
          const raw = await res.text().catch(() => "");
          throw new Error(raw || `Failed to load profiles (${res.status})`);
        }
        const data = (await res.json().catch(() => ({}))) as {
          profiles?: CopilotProfileSummary[];
        };
        if (cancelled) return;
        setProfiles(Array.isArray(data.profiles) ? data.profiles : []);
        setLoadError(null);
      } catch (error) {
        console.error("Unable to load copilot profiles", error);
        if (!cancelled) setLoadError((error as Error).message || "Unable to load profiles");
      } finally {
        if (!cancelled) setIsLoadingProfiles(false);
      }
    }
    void fetchProfiles();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDeleteProfile = useCallback(async (profileId: string) => {
    if (!profileId) return false;
    const target = profiles.find((item) => item.id === profileId);
    const confirmed = typeof window !== "undefined"
      ? window.confirm(`Delete "${target?.profileName ?? "this profile"}"? This action cannot be undone.`)
      : true;
    if (!confirmed) return false;

    setPendingDeleteId(profileId);
    setStatus(null);
    try {
      const res = await fetch("/api/copilot/profiles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: profileId }),
      });
      if (!res.ok) {
        const raw = await res.text().catch(() => "");
        throw new Error(raw || `Failed to delete profile (${res.status})`);
      }
      setProfiles((prev) => prev.filter((item) => item.id !== profileId));
      setStatus("Copilot profile deleted.");
      return true;
    } catch (error) {
      console.error("Delete copilot profile failed", error);
      setStatus((error as Error).message || "Unable to delete profile. Please try again.");
      return false;
    } finally {
      setPendingDeleteId(null);
    }
  }, [profiles]);

  const handleRenameProfile = useCallback(async (profileId: string, nextName: string) => {
    const trimmed = nextName.trim();
    if (!trimmed) {
      setStatus("Profile name is required.");
      return false;
    }

    setPendingRenameId(profileId);
    setStatus(null);
    try {
      const res = await fetch("/api/copilot/profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: profileId, profileName: trimmed }),
      });
      if (!res.ok) {
        const raw = await res.text().catch(() => "");
        throw new Error(raw || `Failed to rename profile (${res.status})`);
      }
      const data = (await res.json().catch(() => ({}))) as { profile?: CopilotProfileSummary };
      if (!data.profile) {
        throw new Error("Profile update incomplete");
      }
      setProfiles((prev) => [data.profile!, ...prev.filter((item) => item.id !== profileId)]);
      setStatus("Copilot profile renamed.");
      return true;
    } catch (error) {
      console.error("Rename copilot profile failed", error);
      setStatus((error as Error).message || "Unable to rename profile. Please try again.");
      return false;
    } finally {
      setPendingRenameId(null);
    }
  }, []);

  const resumeSummary = useMemo(() => {
    if (resumeMode === "upload") {
      return resumeFile ? `${resumeFile.name} (${Math.round(resumeFile.size / 1024)} KB)` : "No file selected";
    }
    const trimmed = resumeText.trim();
    if (!trimmed) return "No text provided";
    return `${trimmed.length} characters captured`;
  }, [resumeFile, resumeMode, resumeText]);

  const jobDescriptionSummary = useMemo(() => {
    if (jobDescriptionMode === "upload") {
      return jobDescriptionFile ? `${jobDescriptionFile.name} (${Math.round(jobDescriptionFile.size / 1024)} KB)` : "No file selected";
    }
    const trimmed = jobDescriptionText.trim();
    if (!trimmed) return "No text provided";
    return `${trimmed.length} characters captured`;
  }, [jobDescriptionFile, jobDescriptionMode, jobDescriptionText]);

  const handleModeChange = useCallback((nextMode: UploadMode, currentMode: UploadMode, resetUpload: () => void) => {
    if (nextMode === currentMode) return;
    resetUpload();
  }, []);

  function resetResume(mode: UploadMode) {
    if (mode === "upload") {
      setResumeText("");
    } else {
      setResumeFile(null);
    }
    setStatus(null);
  }

  function resetJobDescription(mode: UploadMode) {
    if (mode === "upload") {
      setJobDescriptionText("");
    } else {
      setJobDescriptionFile(null);
    }
    setStatus(null);
  }

  function onResumeModeToggle(nextMode: UploadMode) {
    handleModeChange(nextMode, resumeMode, () => resetResume(nextMode));
    setResumeMode(nextMode);
  }

  function onJobDescriptionModeToggle(nextMode: UploadMode) {
    handleModeChange(nextMode, jobDescriptionMode, () => resetJobDescription(nextMode));
    setJobDescriptionMode(nextMode);
  }

  function handleResumeFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setResumeFile(file);
    setStatus(null);
  }

  function handleJobDescriptionFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setJobDescriptionFile(file);
    setStatus(null);
  }

  function toggleClass(active: boolean) {
    return clsx(
      "rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide transition",
      active
        ? "border-foreground bg-foreground text-background"
        : "border-border bg-background text-muted-foreground hover:border-foreground/60 hover:text-foreground"
    );
  }

  async function handleSaveProfile() {
    if (isSubmitting) return false;

    setIsSubmitting(true);
    setStatus(null);

    let success = false;

    try {
      const trimmedProfileName = profileName.trim();
      const trimmedJobRole = jobRole.trim();
      const trimmedProjects = projectDetails.trim();

      const form = new FormData();
      form.set("profileName", trimmedProfileName);
      form.set("jobRole", trimmedJobRole);
      form.set("projectDetails", trimmedProjects);
      form.set("resumeMode", resumeMode);
      form.set("jobDescriptionMode", jobDescriptionMode);

      if (resumeMode === "upload") {
        if (!resumeFile) throw new Error("Resume file is required");
        form.set("resumeFile", resumeFile);
      } else {
        const trimmedResume = resumeText.trim();
        if (!trimmedResume) throw new Error("Resume text is required");
        form.set("resumeText", trimmedResume);
      }

      if (jobDescriptionMode === "upload") {
        if (!jobDescriptionFile) throw new Error("Job description file is required");
        form.set("jobDescriptionFile", jobDescriptionFile);
      } else {
        const trimmedJD = jobDescriptionText.trim();
        if (!trimmedJD) throw new Error("Job description text is required");
        form.set("jobDescriptionText", trimmedJD);
      }

      const res = await fetch("/api/copilot/profiles", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const raw = await res.text().catch(() => "");
        throw new Error(raw || `Failed to save profile (${res.status})`);
      }
      const data = (await res.json().catch(() => ({}))) as {
        profile?: CopilotProfileSummary;
      };
      const savedProfile = data.profile;
      if (savedProfile) {
        setProfiles((prev) => [savedProfile, ...prev.filter((item) => item.id !== savedProfile.id)]);
      }
      setStatus("Copilot profile saved.");
      success = true;
    } catch (error) {
      console.error(error);
      setStatus((error as Error).message || "Failed to save profile. Please retry.");
    } finally {
      setIsSubmitting(false);
    }

    return success;
  }

  const trimmedProfileName = profileName.trim();
  const trimmedJobRole = jobRole.trim();
  const trimmedResumeText = resumeText.trim();
  const trimmedJobDescriptionText = jobDescriptionText.trim();

  const stepIsValid = useMemo(() => {
    switch (activeStep) {
      case 1:
        return Boolean(trimmedProfileName && trimmedJobRole);
      case 2:
        return resumeMode === "upload" ? Boolean(resumeFile) : Boolean(trimmedResumeText);
      case 3:
        return jobDescriptionMode === "upload" ? Boolean(jobDescriptionFile) : Boolean(trimmedJobDescriptionText);
      case 4:
        return true;
      case 5:
        return !isSubmitting;
      default:
        return true;
    }
  }, [
    activeStep,
    trimmedProfileName,
    trimmedJobRole,
    resumeMode,
    resumeFile,
    trimmedResumeText,
    jobDescriptionMode,
    jobDescriptionFile,
    trimmedJobDescriptionText,
    isSubmitting,
  ]);

  const helperMessage = status ?? "Fill in the steps above to hand your copilot everything it needs.";

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
              Quick select saved profiles
            </h2>
            {isLoadingProfiles ? (
              <span className="text-[0.65rem] text-muted-foreground">Loading…</span>
            ) : null}
          </div>
          {loadError ? <p className="text-[0.65rem] text-destructive">{loadError}</p> : null}
          {!isLoadingProfiles && !loadError && !profiles.length ? (
            <p className="text-[0.65rem] text-muted-foreground">
              You don’t have any profiles yet. Complete the steps below to create your first interview copilot.
            </p>
          ) : null}
          <ProfilesGrid
            profiles={profiles}
            pendingDeleteId={pendingDeleteId}
            pendingRenameId={pendingRenameId}
            onDelete={handleDeleteProfile}
            onRename={handleRenameProfile}
          />
        </section>

        <Stepper
          initialStep={1}
          onStepChange={(step) => setActiveStep(step)}
          onFinalStepCompleted={async () => {
            await handleSaveProfile();
            return false;
          }}
          stepCircleContainerClassName="border border-border/50 bg-background/70"
          stepContainerClassName="bg-transparent"
          contentClassName="bg-background/80"
          footerClassName="bg-transparent"
          backButtonText="Back"
          nextButtonText="Next"
          completeButtonText="Save profile"
          backButtonProps={{ disabled: isSubmitting }}
          nextButtonProps={{ disabled: !stepIsValid }}
          renderNextLabel={({ isLastStep }) =>
            isLastStep ? (isSubmitting ? "Saving…" : "Save profile") : "Next"
          }
        >
          <Step>
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold uppercase tracking-tight text-foreground">Profile basics</h2>
                <p className="text-xs text-muted-foreground">
                  Give your copilot a clear name and specify the target job role.
                </p>
              </div>
              <div className="grid gap-3">
                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor="profile-name"
                    className="text-xs font-semibold uppercase tracking-tight text-muted-foreground"
                  >
                    Profile name
                  </Label>
                  <Input
                    id="profile-name"
                    placeholder="e.g. Frontend Interview Coach"
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor="job-role"
                    className="text-xs font-semibold uppercase tracking-tight text-muted-foreground"
                  >
                    Target job role
                  </Label>
                  <Input
                    id="job-role"
                    placeholder="e.g. Senior React Developer"
                    value={jobRole}
                    onChange={(event) => setJobRole(event.target.value)}
                  />
                </div>
              </div>
            </div>
          </Step>

          <Step>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-tight">Resume</h2>
                  <p className="text-xs text-muted-foreground">
                    Upload your resume or paste the highlights you want your copilot to use.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onResumeModeToggle("upload")}
                    className={toggleClass(resumeMode === "upload")}
                  >
                    Upload file
                  </button>
                  <button
                    type="button"
                    onClick={() => onResumeModeToggle("paste")}
                    className={toggleClass(resumeMode === "paste")}
                  >
                    Paste text
                  </button>
                </div>
              </div>
              {resumeMode === "upload" ? (
                <div className="space-y-2 rounded-lg border border-border/60 bg-background/80 p-4">
                  <Label
                    htmlFor="resume-upload"
                    className="text-xs font-semibold uppercase tracking-tight text-muted-foreground"
                  >
                    Supported formats: pdf, doc, docx, txt (max 5MB)
                  </Label>
                  <Input id="resume-upload" type="file" accept={resumeAccept} onChange={handleResumeFileChange} />
                  <p className="text-xs text-muted-foreground">{resumeSummary}</p>
                </div>
              ) : (
                <div className="space-y-2 rounded-lg border border-border/60 bg-background/80 p-4">
                  <Label
                    htmlFor="resume-text"
                    className="text-xs font-semibold uppercase tracking-tight text-muted-foreground"
                  >
                    Paste resume content
                  </Label>
                  <textarea
                    id="resume-text"
                    value={resumeText}
                    onChange={(event) => setResumeText(event.target.value)}
                    className="min-h-[160px] w-full resize-y rounded-md border border-border bg-background p-3 text-xs leading-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Paste your resume or add bullet points covering responsibilities, achievements, and skills."
                  />
                  <p className="text-xs text-muted-foreground">{resumeSummary}</p>
                </div>
              )}
            </div>
          </Step>

          <Step>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-tight">Job description</h2>
                  <p className="text-xs text-muted-foreground">
                    Add the job description so the copilot can tailor answers to the role.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onJobDescriptionModeToggle("upload")}
                    className={toggleClass(jobDescriptionMode === "upload")}
                  >
                    Upload file
                  </button>
                  <button
                    type="button"
                    onClick={() => onJobDescriptionModeToggle("paste")}
                    className={toggleClass(jobDescriptionMode === "paste")}
                  >
                    Paste text
                  </button>
                </div>
              </div>
              {jobDescriptionMode === "upload" ? (
                <div className="space-y-2 rounded-lg border border-border/60 bg-background/80 p-4">
                  <Label
                    htmlFor="job-description-upload"
                    className="text-xs font-semibold uppercase tracking-tight text-muted-foreground"
                  >
                    Supported formats: pdf, doc, docx, txt (max 5MB)
                  </Label>
                  <Input
                    id="job-description-upload"
                    type="file"
                    accept={jobDescriptionAccept}
                    onChange={handleJobDescriptionFileChange}
                  />
                  <p className="text-xs text-muted-foreground">{jobDescriptionSummary}</p>
                </div>
              ) : (
                <div className="space-y-2 rounded-lg border border-border/60 bg-background/80 p-4">
                  <Label
                    htmlFor="job-description-text"
                    className="text-xs font-semibold uppercase tracking-tight text-muted-foreground"
                  >
                    Paste job description content
                  </Label>
                  <textarea
                    id="job-description-text"
                    value={jobDescriptionText}
                    onChange={(event) => setJobDescriptionText(event.target.value)}
                    className="min-h-[160px] w-full resize-y rounded-md border border-border bg-background p-3 text-xs leading-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Paste the job description, responsibilities, and required skills."
                  />
                  <p className="text-xs text-muted-foreground">{jobDescriptionSummary}</p>
                </div>
              )}
            </div>
          </Step>

          <Step>
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold uppercase tracking-tight">Project & research highlights</h2>
                <p className="text-xs text-muted-foreground">
                  Share the work you want the copilot to reference in coaching sessions.
                </p>
              </div>
              <textarea
                id="project-details"
                value={projectDetails}
                onChange={(event) => setProjectDetails(event.target.value)}
                className="min-h-[220px] w-full resize-y rounded-md border border-border bg-background p-3 text-xs leading-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Describe initiatives you are proud of, leadership stories, impact metrics, and technologies used."
              />
              <p className="text-[0.65rem] text-muted-foreground">
                {projectDetails
                  ? `${projectDetails.length} characters captured.`
                  : "Optional but encouraged for richer coaching."}
              </p>
            </div>
          </Step>

          <Step>
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold uppercase tracking-tight">Review & save</h2>
                <p className="text-xs text-muted-foreground">
                  Confirm everything looks right before saving this interview copilot profile.
                </p>
              </div>
              <div className="space-y-3 rounded-xl border border-border/60 bg-background/80 p-4 text-xs shadow-sm">
                <dl className="grid gap-3">
                  <div>
                    <dt className="font-semibold text-foreground">Profile name</dt>
                    <dd className="text-muted-foreground">{trimmedProfileName || "Not set"}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-foreground">Target role</dt>
                    <dd className="text-muted-foreground">{trimmedJobRole || "Not set"}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-foreground">Resume</dt>
                    <dd className="text-muted-foreground">{resumeSummary}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-foreground">Job description</dt>
                    <dd className="text-muted-foreground">{jobDescriptionSummary}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-foreground">Project highlights</dt>
                    <dd className="text-muted-foreground">
                      {projectDetails
                        ? `${projectDetails.length} characters provided.`
                        : "Optional — add when you’re ready."}
                    </dd>
                  </div>
                </dl>
              </div>
              <p className="text-[0.65rem] text-muted-foreground">
                {isSubmitting
                  ? "Saving your copilot profile…"
                  : "Click Save profile to create or update this copilot."}
              </p>
            </div>
          </Step>
        </Stepper>

        <div className="rounded-md border border-border/60 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
          {helperMessage}
        </div>
      </div>

    
    </div>
  );
}
