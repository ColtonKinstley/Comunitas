# Comunitas Induction App — Design

> Status: approved for build (hackathon). Scope: local-dev full stack — voice-first
> induction that produces the matcher-ready patient profile, plus the patient-facing
> app surface (home, profile, pod, calendar, map, events, history).

## Goals

1. **Induction** captures *everything the pod matcher needs*: geography, health
   conditions, lifestyle goals, starting fitness, interests, weekly availability,
   and constraints (mobility, transport, confidence). Voice-first, no forms.
2. Responsive **mobile-first web app** simulating a mobile experience (phone frame
   on desktop). No native app.
3. Everything runs locally: Postgres, API, web. Seeded so every screen demos well.

## Stack

- **Monorepo**: bun workspaces — `api/`, `web/`, shared types in `api/src/types.ts`
  re-exported to web via workspace import (keep it simple; no separate package).
- **api/**: Bun + Hono, Drizzle ORM, Postgres 18 (local Homebrew, port 5432,
  database `comunitas`). Serves `/api/*` on **port 3001**, binds `0.0.0.0`.
- **web/**: Vite + React + TypeScript + Tailwind (v4, vite plugin),
  react-router (library mode), Leaflet + react-leaflet. Dev server **port 5173**,
  binds `0.0.0.0`, proxies `/api` → `localhost:3001`.
- **Voice**: OpenAI Realtime API, model **`gpt-realtime-2.1`**, browser WebRTC.
  Server mints ephemeral client secrets (`POST /v1/realtime/client_secrets`);
  browser POSTs SDP offer to `https://api.openai.com/v1/realtime/calls`, events
  over data channel `oai-events`.
- **Env**: `.env` at repo root (gitignored), `.env.example` committed. Keys:
  `DATABASE_URL`, `OPENAI_API_KEY`, `PORT`.
- No auth. "Current patient" = localStorage `comunitas.patientId`. Welcome screen
  offers **Start induction** (new patient) or **Continue as Priya (demo)** (seeded
  patient with rich data).

## Data model (Drizzle, Postgres)

The profile is the matcher's input — geography first, then conditions/goals/fitness/
interests/availability. Enumerable facts live in join tables (matcher-friendly),
narrative color in text columns.

- `patients`: id uuid pk, name, age_band (`18-29|30-44|45-59|60-74|75+`), postcode,
  lat, lng (real), travel_radius_km (int, default 3), transport_modes text[]
  (`walk|cycle|bus|tube|car`), mobility_notes text, confidence_level int 1–5,
  fitness_level int 1–5, fitness_notes text, availability jsonb
  (`{mon:["morning","afternoon","evening"], …}`), induction_status
  (`pending|in_progress|complete`), created_at.
- `patient_conditions`: patient_id fk, condition text (slug, e.g. `type2_diabetes`,
  `hypertension`, `obesity`, `anxiety`, `arthritis`), note text.
- `patient_goals`: patient_id fk, goal text (slug, e.g. `lose_weight`,
  `improve_fitness`, `reduce_blood_pressure`, `social_connection`, `manage_stress`), note text.
- `patient_interests`: patient_id fk, interest text (slug, e.g. `walking`,
  `swimming`, `gardening`, `cycling`, `dancing`, `yoga`, `crafts`).
- `pods`: id uuid pk, name, status (`forming|active`), centroid_lat, centroid_lng,
  description, created_at.
- `pod_members`: pod_id fk, patient_id fk, joined_at.
- `events`: id uuid pk, pod_id fk, title, description, activity_type (slug),
  venue_name, lat, lng, starts_at, ends_at (timestamptz),
  status (`proposed|confirmed|completed|cancelled`), source (`discovered|adhoc`).
- `event_rsvps`: event_id fk, patient_id fk, status (`yes|no|maybe`),
  attended boolean (null until event completes).
- `induction_sessions`: id uuid pk, patient_id fk, transcript jsonb (array of
  `{role, text, at}`), status (`active|complete|abandoned`), created_at.

## API surface (Hono, all under `/api`)

- `POST /api/realtime/session` → `{value, expiresAt, patientId, sessionId}` —
  creates patient row (`induction_status: in_progress`) + induction_session, mints
  ephemeral secret with interviewer instructions + tools baked in. Accepts optional
  `{patientId}` to resume.
- `GET /api/patients/:id` → full profile (joins conditions/goals/interests, pod).
- `PATCH /api/patients/:id/profile` → partial update; scalar fields plus full-array
  replace for `conditions|goals|interests` (`[{slug, note?}]`). Geocodes postcode →
  lat/lng via **postcodes.io** (free UK API) when postcode present without lat/lng.
- `POST /api/patients/:id/complete-induction` → status complete, assigns patient to
  the best seeded pod (nearest centroid within travel radius; else nearest), returns pod.
- `POST /api/induction/:sessionId/transcript` → append transcript entries.
- `GET /api/pods/:id` → pod + members (name, interests — no health data of others).
- `GET /api/patients/:id/events?from&to&status` → pod events with own RSVP status.
- `GET /api/events/:id` → detail + RSVP counts.
- `POST /api/events/:id/rsvp` → `{patientId, status}`.
- `GET /api/patients/:id/history` → completed events + attended flag + current/best
  weekly streak.
- `GET /api/patients/:id/map` → patient lat/lng + radius, pod members (first name +
  approx location only), upcoming events with venues.

## Web app

Phone-frame layout: full viewport ≤480px; desktop centers a 414×min(896, 92vh)
rounded frame. Bottom tab nav: **Home, Calendar, Map, Events, Profile**.
Induction and welcome render without tab nav.

Routes:
- `/` welcome — brand, two CTAs (start induction / continue as demo patient).
- `/induction` — voice interview: mic permission → connect → live conversation with
  animated speaking indicator, streaming captions (user + assistant), and a
  **live profile card** that fills in as `update_profile` tool calls land. Text
  input fallback for no-mic environments. On `complete_induction` → pod reveal
  moment ("We found your pod") → `/home`.
- `/home` — greeting, next event card (RSVP inline), pod snapshot, streak chip,
  links to history.
- `/profile` — the structured profile, grouped (about, location & travel, health &
  goals [conditions, goals, fitness], interests, availability grid); tap-to-edit.
- `/pod` — pod name/description, member list, shared interests, meeting area map thumb.
- `/calendar` — month grid with event dots + agenda list below for selected day;
  availability shading optional.
- `/map` — Leaflet + OSM tiles: you (marker), travel-radius circle, event venues
  (popups → event detail), pod centroid.
- `/events` — upcoming list (status chips, RSVP buttons), past collapsed.
- `/events/:id` — detail: what/where/when, map thumb, RSVP, who's going.
- `/history` — past events timeline, attended ✓/✗, adherence streak header.

## Voice induction (the core)

Server bakes into the ephemeral session: interviewer persona (warm, unhurried,
plain-language, ONE question at a time, confirm back what it heard; explicit
boundary — no medical advice, no diagnosis; it's collecting info to find them a
local group) and tools:

- `update_profile(partial)` — call *as soon as* any field is learned. Schema mirrors
  PATCH profile body. Client applies to profile card immediately + PATCHes API.
- `complete_induction()` — only after coverage checklist met (location+radius,
  ≥1 condition, ≥1 goal, fitness, ≥1 interest, availability, constraints asked).
  Client POSTs complete-induction, shows pod reveal.

Interview arc: name → area (postcode) + how far/transport → what brought them here
(conditions surface naturally) → goals → current activity/fitness → interests →
weekly availability → constraints/confidence → recap → complete.

Client handles: `response.function_call_arguments.done` → run tool → send
`conversation.item.create` (function_call_output) + `response.create`; input
transcription events → captions; transcript appended to induction_session.

## Seed data

Deterministic script (`api/src/db/seed.ts`, `bun run seed`): ~20 patients around
East/North London (Hackney, Bethnal Green, Islington, Camden — real postcodes,
hardcoded lat/lng), 3 pods ("Victoria Park Walkers", "Islington Strength &
Balance", "Regent's Canal Cyclists") with 5–7 members each, per pod: 4–6 past
completed events with attendance (streaks!) + 2–3 upcoming (proposed/confirmed) at
real venues (Victoria Park, London Fields Lido, Regent's Canal towpath). Demo
patient **Priya Shah** (Hackney, type2_diabetes, lose_weight + social_connection,
fitness 2, walking + gardening) in Victoria Park Walkers with history.

## Error handling & testing

- API: zod-validated bodies, 400 on bad input, JSON `{error}` shape; geocode
  failure → save postcode without lat/lng, warn.
- Induction: WebRTC/API failure → visible error state + retry; text fallback keeps
  demo alive without mic. Session expiry (~1 min secret) handled by connecting
  immediately after mint.
- Playwright QA (mobile viewport) over the demo patient covers every screen;
  induction QA'd via text fallback (no mic in headless).

## Out of scope (this build)

Real matching engine (assignment = nearest-pod heuristic), event planning agent,
activity discovery ingestion, GP referral flow, auth/multi-tenancy, GDPR posture.
