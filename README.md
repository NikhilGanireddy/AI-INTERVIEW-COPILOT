

# Interview Trainer

**Interview Trainer** is an internal AI-powered platform for practicing, analyzing, and improving interview skills. It provides real-time feedback, voice cloning, live captions, and analytics to help users prepare for interviews more effectively.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Folder Structure](#folder-structure)
- [Tech Stack](#tech-stack)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Notes](#notes)
- [Contact](#contact)

---

## Project Overview

Interview Trainer enables users to simulate interviews, receive AI-generated questions, transcribe and analyze their answers, and track their progress. The platform leverages advanced speech-to-text and text-to-speech APIs, as well as voice cloning, to create a realistic and interactive interview experience.

---

## Features

- **Interview Copilot**: Create and manage interview profiles, upload resumes and job descriptions, and receive AI-generated questions and feedback.
- **Voice Cloning**: Clone your voice for personalized TTS and practice sessions.
- **Speech-to-Text (STT)**: Real-time transcription of answers using Deepgram.
- **Text-to-Speech (TTS)**: Generate lifelike audio responses using ElevenLabs.
- **Live Captions**: View live transcriptions during meetings or practice sessions.
- **Dashboard**: Track interview history and performance analytics.
- **User Settings**: Customize experience and manage data.
- **Authentication**: Secure access via Clerk.

---

## Folder Structure

```
app/
  (authorization)/         # Sign-in and sign-up flows
  (directory)/             # Main features: copilot, dashboard, meeting, voice (clone, stt, tts)
  api/                     # API routes for answers, copilot, deepgram, meeting, settings, stt, voice
  live-captions/           # Live captioning components
  globals.css, layout.tsx  # Global styles and layout
components/
  ui/                      # Reusable UI components (button, card, input, etc.)
  voice/                   # Voice-related components (recorder, edit, delete)
lib/
  db.ts                    # Database connection (Mongoose)
  utils.ts                 # Utility functions
  models/                  # Mongoose models (InterviewCopilotProfile, MeetingTurn, UserSettings, VoiceProfile)
public/
  assets/                  # 3D models and demo images
  *.svg                    # Static SVG assets
```

---

## Tech Stack

- **Framework**: Next.js 15 (App Router, Edge & Node API routes)
- **Frontend**: React 19, Tailwind CSS, Radix UI, Lucide Icons
- **Backend**: Next.js API routes, Mongoose (MongoDB)
- **AI/ML APIs**: Deepgram (STT), ElevenLabs (TTS)
- **Authentication**: Clerk
- **3D/Visuals**: Three.js, React Three Fiber, GSAP, OGL

---

## Setup & Installation

1. **Clone the repository** (private, internal use only).

2. **Install dependencies:**
	```bash
	npm install
	# or
	yarn install
	# or
	pnpm install
	```

3. **Set up environment variables:**
	- Copy `.env.example` to `.env.local` and fill in your API keys for Deepgram, ElevenLabs, Clerk, and MongoDB.

4. **Run the development server:**
	```bash
	npm run dev
	# or
	yarn dev
	# or
	pnpm dev
	```
	Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

You will need to provide the following environment variables in your `.env.local` file:

- `CLERK_SECRET_KEY`
- `DEEPGRAM_API_KEY`
- `ELEVENLABS_API_KEY`
- `MONGODB_URI`
- (Add any other required keys as needed by your integrations)

---

## Scripts

- `dev` — Start the development server
- `build` — Build for production
- `start` — Start the production server
- `lint` — Run ESLint

---

## Notes

- This project is for internal/private use only. Do not share or distribute outside your organization.
- For questions about architecture or extending the platform, contact the project maintainer.

---

## Contact

For internal support or questions, contact the project owner or your engineering lead.

---
# AI-INTERVIEW-COPILOT
