# CaseForge — Product Requirements Document (PRD)
**Version:** 1.0 — MVP  
**Status:** Ready for Build  
**Stack:** Next.js 14 (App Router) · Supabase · AssemblyAI · Claude API · Resend · Vercel Blob

---

## 1. Product Overview

CaseForge is an async audio case study platform. B2B founders and consultants generate a magic link, send it to their client, and the client records 90-second voice answers to 3 AI-generated questions. CaseForge transcribes, cleans, and synthesizes the answers into a PDF case study, a hosted web page, and LinkedIn quote snippets — with zero scheduling required from either party.

### Core Value Proposition
> "Get metric-driven case studies without making your clients schedule another Zoom call."

---

## 2. Users & Roles

| Role | Description | Auth Method |
|------|-------------|-------------|
| **Creator** | The B2B founder / consultant who builds campaigns and receives outputs | Email + Password (Supabase Auth) |
| **Respondent** | The client who records audio answers | Magic link (no account, no app) |

---

## 3. Tech Stack Decisions

| Concern | Choice | Rationale |
|---|---|---|
| Framework | Next.js 14 App Router | Fullstack, API routes, SSR for hosted case study pages |
| Database + Auth | Supabase (Postgres + Auth) | Row-level security, realtime status updates, auth built-in |
| File Storage | Vercel Blob | Zero-config, co-located with Next.js on Vercel, handles audio + PDF |
| Transcription | AssemblyAI | Best accuracy on casual speech, `iab_categories`, speaker detection, async webhook |
| LLM | Claude (claude-sonnet-4-20250514) | Question generation + synthesis + quote extraction |
| Email | Resend | Developer-friendly, great Next.js DX |
| PDF Generation | `@react-pdf/renderer` | JSX-based, no headless browser needed |
| Payments | Stripe (scaffold only, not active in MVP) | Add later — schema supports it |

---

## 4. Data Models

### `users` (managed by Supabase Auth)
Extended with a `profiles` table:
```
profiles
  id              uuid PK (references auth.users)
  full_name       text
  company_name    text
  created_at      timestamp
```

### `campaigns`
```
id                uuid PK
creator_id        uuid FK → profiles.id
client_name       text
service_provided  text
status            enum: draft | sent | recording | processing | complete | error
magic_token       uuid (unique, used in public URL)
questions         jsonb  [ { id, text } × 3 ]
created_at        timestamp
updated_at        timestamp
```

### `responses`
```
id                uuid PK
campaign_id       uuid FK → campaigns.id
question_id       text
audio_url         text  (Vercel Blob URL)
transcript_raw    text
transcript_clean  text
duration_seconds  integer
created_at        timestamp
```

### `outputs`
```
id                uuid PK
campaign_id       uuid FK → campaigns.id
case_study_text   text   (full synthesized narrative)
pdf_url           text   (Vercel Blob URL)
web_slug          text   (unique slug for hosted page)
linkedin_quotes   jsonb  [ { quote, context } × 3 ]
created_at        timestamp
```

---

## 5. Application Routes

### Creator-Side (Authenticated)

| Route | Description |
|---|---|
| `/` | Marketing landing page (logged-out) / redirects to `/dashboard` if logged in |
| `/login` | Supabase Auth email+password login |
| `/signup` | Account creation |
| `/dashboard` | Lists all campaigns with status badges |
| `/campaigns/new` | Campaign Builder — step 1 (client name + service) |
| `/campaigns/[id]` | Campaign detail — questions preview, share link, outputs |
| `/campaigns/[id]/outputs` | Full outputs view: PDF embed, web page preview, LinkedIn quotes |

### Client-Side (Public, Token-Gated)

| Route | Description |
|---|---|
| `/interview/[token]` | Landing screen for respondent |
| `/interview/[token]/record` | Recording interface — 3 questions sequentially |
| `/interview/[token]/done` | Thank-you screen |

### Public Output Pages

| Route | Description |
|---|---|
| `/case-study/[slug]` | Publicly hosted, SEO-friendly case study page |

### API Routes

| Route | Method | Description |
|---|---|---|
| `/api/campaigns` | POST | Create new campaign, trigger question generation |
| `/api/campaigns/[id]` | GET/PATCH | Fetch or update campaign |
| `/api/interview/[token]` | GET | Validate token, return campaign + questions |
| `/api/interview/[token]/upload` | POST | Receive audio blob, store to Vercel Blob, queue transcription |
| `/api/interview/[token]/complete` | POST | Mark all recordings done, trigger synthesis pipeline |
| `/api/webhooks/assemblyai` | POST | Receive transcription results, trigger synthesis when all 3 done |
| `/api/outputs/[campaignId]` | GET | Return fully generated outputs |

---

## 6. Feature Specifications

### F1 — Campaign Builder
**Location:** `/campaigns/new`

**Step 1: Inputs**
- Field: Client / Company Name (text)
- Field: Service You Provided (text, e.g. "email marketing automation")
- CTA: "Generate Questions"

**Step 2: Question Review**
- AI generates 3 questions via Claude, focused on:
  1. Quantifiable outcome (revenue, time saved, leads generated)
  2. Before/after contrast (what was the situation before?)
  3. Recommendation/emotional close (would you recommend us, why?)
- Creator can regenerate any single question or all three
- CTA: "Create Campaign & Get Link"

**Step 3: Share**
- Display generated magic link
- One-click copy button
- Pre-written email and SMS templates to send to client
- Campaign moves to `sent` status

---

### F2 — Respondent Recording Interface
**Location:** `/interview/[token]/record`

**Design principles:**
- Mobile-first, full-screen, zero friction
- No login, no app download
- One question visible at a time

**Flow:**
1. Landing screen: client name greeting, "This will take ~90 seconds" framing, Start button
2. For each question (1 of 3):
   - Large question text displayed prominently
   - "Hold to Record" button (MediaRecorder API)
   - Live waveform visualization while recording
   - "Tap to Stop" when done
   - Playback option before submitting
   - "Submit Answer" → next question
   - Progress indicator: "Question 2 of 3"
3. Audio is uploaded to API on each submission (not batched at end)
4. Thank-you screen after Q3

**Technical:**
- `MediaRecorder` API → `.webm` audio → POST to `/api/interview/[token]/upload`
- Max recording time per question: 3 minutes (soft cap, warned at 2:30)
- If upload fails: retry with exponential backoff, show friendly error

---

### F3 — Transcription Pipeline
**Service:** AssemblyAI

**Flow:**
1. Audio uploaded to Vercel Blob → URL returned
2. POST to AssemblyAI `/v2/transcript` with audio URL
  - Enable: `punctuate: true`, `format_text: true`, `filter_profanity: false`
3. Webhook fires to `/api/webhooks/assemblyai` on completion
4. Webhook handler saves `transcript_raw` to `responses` table
5. Claude called to produce `transcript_clean`:
   - Remove filler words (um, uh, like, you know)
   - Fix run-on sentences
   - Preserve exact numbers, names, and metrics verbatim
6. When all 3 responses for a campaign have `transcript_clean`, trigger F4

---

### F4 — Synthesis & Output Generation
**Triggered:** Automatically after all 3 transcripts are clean

**Claude Prompt Strategy:**

*System:* You are a B2B case study writer. You write in clear, punchy, third-person narrative. You never invent metrics — only use what's explicitly stated by the client. You write at a 9th-grade reading level with professional tone.

*Synthesis prompt inputs:*
- `client_name`, `service_provided`
- Q1 + clean transcript, Q2 + clean transcript, Q3 + clean transcript

*Outputs requested (structured JSON):*
```json
{
  "title": "How [Company] achieved [Result] with [Service]",
  "summary": "2-sentence hook paragraph",
  "challenge": "2-3 sentences on the before state",
  "solution": "3-4 sentences on what was done",
  "results": "2-3 sentences, leading with the strongest metric",
  "testimonial_quote": "Best single verbatim or lightly edited quote from transcripts",
  "linkedin_quotes": [
    { "quote": "...", "context": "short attribution line" },
    { "quote": "...", "context": "..." },
    { "quote": "...", "context": "..." }
  ]
}
```

**Outputs generated:**
1. **PDF** — rendered via `@react-pdf/renderer`, stored to Vercel Blob
2. **Web Page** — data stored in `outputs` table, rendered at `/case-study/[slug]`
3. **LinkedIn Snippets** — stored as JSONB, displayed as copyable cards in dashboard

Campaign status → `complete`. Creator gets email notification via Resend.

---

### F5 — Creator Dashboard

**Campaign list view:**
- Campaign name (client + service)
- Status badge: Draft / Sent / Recording / Processing / Complete / Error
- Created date
- "View" CTA

**Campaign detail view (Complete):**
- Tab 1: PDF — embedded preview + download button
- Tab 2: Web Page — live preview iframe + "Copy Public Link"
- Tab 3: LinkedIn Quotes — 3 cards, each with one-click copy

---

## 7. Status State Machine

```
draft → sent → recording → processing → complete
                                      ↘ error
```

| Transition | Trigger |
|---|---|
| `draft → sent` | Creator clicks "Create Campaign & Get Link" |
| `sent → recording` | Respondent opens the magic link |
| `recording → processing` | Respondent submits final (3rd) answer |
| `processing → complete` | All outputs generated successfully |
| `processing → error` | Any step in synthesis pipeline fails |

---

## 8. Email Notifications (Resend)

| Event | Recipient | Template |
|---|---|---|
| Campaign created | Creator | "Your link is ready — here's how to send it" |
| Client opens link | Creator | "✅ [Client Name] just started their interview" |
| Outputs ready | Creator | "🎉 Your case study for [Client Name] is ready" |

---

## 9. Non-Functional Requirements

- **Mobile-first:** Recording UI must be fully functional on iOS Safari and Android Chrome
- **No app install:** PWA or standard web only
- **Latency:** Transcription + synthesis should complete within 3 minutes of final recording submission
- **Storage:** Audio files retained for 30 days; PDFs indefinitely
- **Security:** Magic tokens are UUID v4, single-use context (respondent cannot resubmit after completion)
- **Error handling:** All pipeline steps have retry logic; creator sees error state in dashboard with "Retry" CTA

---

## 10. Out of Scope for MVP

- Stripe billing / subscription enforcement
- Team/multi-user workspaces
- Custom branding on case study pages
- CRM integrations (HubSpot, Salesforce)
- Video recording option
- Multi-language support
- Analytics on case study page views
- Client re-recording / editing after submission

---

## 11. Success Metrics (Post-Launch)

- % of sent campaigns that result in a completed interview
- Time from campaign creation to outputs ready
- Creator retention (campaigns created per user per month)
- PDF download rate vs. web page share rate
