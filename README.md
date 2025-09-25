# Nika AI
> Real-time AI copilot that listens, coaches, and speaks back during your mock interviews.

Nika AI bundles live transcription, Grok-powered coaching, and custom voice synthesis into a single Next.js workspace. Capture a meeting tab, stream captions through Deepgram, let Grok craft tailored coaching, and answer in your cloned ElevenLabs voice – all while Clerk keeps the experience gated to signed-in users.

---

## How to Run
1. Install dependencies: `npm install`
2. Create `.env.local` and set `NEXT_PUBLIC_PRACTICE_ONLY=true` for practice mode (omit or set false for live mode).
3. Start the dev server: `npm run dev`
4. Execute unit tests: `npm run test`
5. Build the optional Chrome extension bundle: `npm run build:ext` (outputs to `extension/dist/`)

---

## Feature Tour
- **Interview Copilot workspace** – build reusable candidate profiles (resume, job brief, project notes) with a guided Stepper UI (`app/(directory)/copilot/CopilotForm.tsx`) and manage them inline.
- **Meeting command center** – capture a browser tab, stream live captions, fire questions to Grok, and archive Q/A history without leaving the page (`app/(directory)/meeting/meeting-client.tsx`).
- **Voice lab** – clone voices, edit their labels, and try instant TTS playback with streaming ElevenLabs audio (`app/(directory)/voice/clone`, `/voice/tts`).
- **Live captions on demand** – spin up a lightweight captioner for a Meet or Zoom tab in seconds (`app/live-captions/LiveCaptions.tsx`).

---

## Architecture at a Glance
```
┌─────────────────────────────── Frontend ──────────────────────────────┐
│ Next.js 15 App Router                                                 │
│ • UI + client hooks (React 19, Tailwind, Radix)                       │
│ • Clerk components for auth gating                                    │
│ • Streaming/audio capture logic (MediaRecorder + Web Audio)           │
└───────────────────────────────▲───────────────────────────────────────┘
                                │ fetch / stream
┌───────────────────────────────┴───────────────────────────────────────┐
│ API Routes (Node & Edge runtime)                                      │
│ • `/api/voice/*` → ElevenLabs TTS + cloning                           │
│ • `/api/stt/*` → Deepgram tokens + remote proxy                       │
│ • `/api/answers/grok` → Grok SSE streaming                            │
│ • `/api/copilot/*`, `/api/meeting/*`, `/api/settings`                 │
└───────────────────────────────▲───────────────────────────────────────┘
                                │ MongoDB (Mongoose)
┌───────────────────────────────┴───────────────────────────────────────┐
│ Database layer (`lib/db.ts`, `lib/models/*`)                          │
│ • InterviewCopilotProfile, MeetingTurn, VoiceProfile, UserSettings    │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack
- **Framework**: Next.js 15 App Router, React 19, TypeScript
- **Styling**: Tailwind CSS 4 + Radix UI primitives
- **Auth**: Clerk middleware & components
- **Data**: MongoDB via Mongoose models
- **Speech**: Deepgram SDK (live STT), ElevenLabs JS SDK (TTS & cloning)
- **LLM**: xAI Grok streaming completions
- **Enhancements**: GSAP, react-three-fiber, OGL, Motion for animated surfaces

---

## Project Layout
```
app/                    # Routes + API endpoints
  (authorization)/      # Clerk sign-in/sign-up flows
  (directory)/          # Auth-protected workspaces (copilot, coding-copilot, meeting, voice)
  live-captions/        # Lightweight caption tool
components/             # UI primitives + feature components (Stepper, Recorder)
lib/                    # DB connector and Mongoose models
public/                 # Static assets
middleware.ts           # Clerk protection matcher
```

---

## Getting Started
1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Configure environment** – create `.env.local` with the variables listed below.
3. **Run MongoDB** – point `MONGODB_URI` to Atlas or a local instance.
4. **Start the dev server**
   ```bash
   npm run dev
   # opens http://localhost:3000 with Turbopack
   ```
5. **Sign in** – Clerk requires matching origins (set http://localhost:3000 in the dashboard).

To ship a production build:
```bash
npm run build
npm start
```

---

## Environment Variables
| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk frontend key for widgets.
| `CLERK_SECRET_KEY` | ✅ | Clerk server-side secret for auth enforcement.
| `MONGODB_URI` | ✅ | MongoDB connection string (`interview_coach` DB name used).
| `DEEPGRAM_API_KEY` | ✅ | Server-side key for issuing ephemeral STT tokens.
| `NEXT_PUBLIC_DEEPGRAM_API_KEY` | ⚠️ optional | Local fallback if ephemeral token route fails.
| `ELEVENLABS_API_KEY` | ✅ | Used for cloning voices and streaming TTS.
| `XAI_API_KEY` or `GROK_API_KEY` | ✅ | Streams Grok completions for coaching answers.
| `XAI_MODEL` | optional | Override Grok model (defaults to `grok-2-latest`).

Example `.env.local`:
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
MONGODB_URI=mongodb+srv://...
DEEPGRAM_API_KEY=dg_...
ELEVENLABS_API_KEY=el_...
XAI_API_KEY=xaI_...
```

---

## npm Scripts
| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js with Turbopack (hot reload + streaming).
| `npm run build` | Production compile of the App Router + API routes.
| `npm start` | Launch the built server on port 3000.

---

## Core Data Models
| Model | Stored Fields |
| --- | --- |
| `InterviewCopilotProfile` | `userId`, `profileName`, `jobRole`, `resume` variant (uploaded binary or pasted text), `jobDescription` variant, `projectDetails` (`lib/models/InterviewCopilotProfile.ts`). |
| `MeetingTurn` | Captures each Q/A turn with timestamps, ordering, session + profile linkage (`lib/models/MeetingTurn.ts`). |
| `VoiceProfile` | ElevenLabs voice registry scoped per user (`lib/models/VoiceProfile.ts`). |
| `UserSettings` | Flexible per-user settings document (`lib/models/UserSettings.ts`). |

---

## Key API Endpoints
| Route | Method(s) | Notes |
| --- | --- | --- |
| `/api/copilot/profiles` | GET, POST, PATCH, DELETE | CRUD for interview profiles (FormData upload support). |
| `/api/meeting/history` | GET, POST, PATCH | Persist live meeting questions and Grok answers. |
| `/api/voice/clone` | POST | Proxy to ElevenLabs voice cloning; stores `VoiceProfile`. |
| `/api/voice/[voiceId]` | PATCH, DELETE | Rename or remove a cloned voice. |
| `/api/voice/speak` | POST | ElevenLabs TTS (Node runtime) with automatic voice fallback. |
| `/api/voice/stream` | GET | Edge-optimised streaming TTS for low-latency playback. |
| `/api/stt/deepgram-token` | GET | Issues user-scoped Deepgram tokens via SDK grant. |
| `/api/stt/remote` | GET | CORS-safe audio proxy for remote streams fed into Deepgram. |
| `/api/answers/grok` | POST | xAI Grok chat completions streamed via SSE. |
| `/api/settings` | GET, POST | Store arbitrary per-user preferences with `$set`. |

---

## Development Notes
- **Auth-first**: `middleware.ts` wraps every route with Clerk; local dev needs valid Clerk keys.
- **Streaming everywhere**: Meeting and caption features rely on long-lived WebSockets and SSE. Keep dev tools open to inspect event frames.
- **Voice uploads**: `app/(directory)/voice/clone/CloneVoiceForm.tsx` accepts WEBM/MP3/WAV and shows inline success/error states. Files post directly to `/api/voice/clone`.
- **History sync**: Meeting answers persist through `/api/meeting/history` so refreshing the page restores prior turns for the selected profile.
- **Edge vs Node**: High-throughput TTS streaming lives on the Edge runtime; cloning and DB-backed routes stay on Node to access Mongoose.

---

## Troubleshooting
- **401 responses** – confirm Clerk keys and that the site URL matches your dashboard configuration.
- **Deepgram token fails** – ensure `DEEPGRAM_API_KEY` is set; the SDK grant in `/api/stt/deepgram-token` returns status + TTL in logs.
- **ElevenLabs upload 4xx** – audio samples must be shorter than 30s and `ELEVENLABS_API_KEY` must have cloning enabled.
- **Mongo connection errors** – whitelist your IP in Atlas or run `mongod` locally and update `MONGODB_URI`.

---

## Roadmap Ideas
- AI scoring rubrics per competency.
- Team dashboards with shareable session recaps.
- WebRTC peer coaching or mentor co-pilot seats.
- Automatic resume/JD parsing using LangChain or embeddings.

---

## License
Private repository – proprietary software. All rights reserved.
