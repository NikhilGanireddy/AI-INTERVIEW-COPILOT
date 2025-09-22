import { auth } from "@clerk/nextjs/server";
import InterviewCopilotForm from "./CopilotForm";

export default async function InterviewCopilotPage() {
  await auth.protect();

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden" data-animate="stagger">
      <div className="space-y-2" data-animate-child>
        <h1 className="text-2xl font-semibold uppercase tracking-wide">Interview Copilot</h1>
        <p className="max-w-2xl text-muted-foreground">
          Assemble everything your AI copilot needs before a mock interview. Upload or paste your resume, provide the target job details, and share deeper context about your work.
        </p>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden" data-animate="fade-up">
        <div className="flex h-full min-h-0 flex-col rounded-xl border bg-background/60 p-5 shadow-sm">
          <InterviewCopilotForm />
        </div>
      </div>
    </div>
  );
}
