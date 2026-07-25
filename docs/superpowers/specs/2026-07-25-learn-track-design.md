# Learn track — design

2026-07-25. Duolingo-style bite-sized lessons that teach modern healthy-lifestyle
thinking. This lays the foundation: one general health track for everyone.
Custom skill trees driven by the patient's goals come later, so the content
model must not assume a single hard-coded track forever, but we build exactly
one now.

## Decisions (made autonomously — user was away)

- **Content lives in the web app as static TypeScript** (`web/src/features/learn/track.ts`).
  Only *progress* is server-side. Rationale: content has no per-patient
  variation yet, the API/web type sync is manual in this repo (see README
  gotchas), and a static module keeps the hackathon loop fast. When goal-based
  skill trees arrive, content moves behind the API; the progress schema already
  keys lessons by slug so it survives that move.
- **Progress persists in Postgres** keyed `(patientId, lessonId)` — localStorage
  would break the "continue as Priya on another device" demo flow.
- **Lessons unlock sequentially** along one path (the Duolingo mechanic).
  Completed lessons stay repeatable for practice; re-completion just updates
  the stored score.
- **XP is derived, not stored**: 10 XP per completed lesson. No streaks for
  learning yet — the app already has an attendance streak and two streaks
  would compete.
- The protein lesson teaches the user-specified target of **2.2 g protein per
  kg body weight per day**, framed as an upper target for active adults with a
  "check with your GP if you have kidney disease" caveat.

## Content model

```ts
type LessonStep =
  | { kind: "info"; title: string; body: string; emoji: string }
  | { kind: "choice"; prompt: string; options: string[]; correctIndex: number;
      explanation: string };

interface Lesson { id: string /* slug */; title: string; blurb: string; steps: LessonStep[]; }
interface Unit { id: string; title: string; emoji: string; blurb: string; lessons: Lesson[]; }
// The track is Unit[] — "Foundations of Healthy Living".
```

Five units, two lessons each, 5–7 steps per lesson (~1–2 min each), mixing
info cards with checking questions:

1. **Sleep** 🌙 — "Wind down right" (bright light/screens before bed,
   melatonin); "Protect your rhythm" (consistent times, caffeine cutoff).
2. **Protein** 💪 — "Why protein matters" (muscle loss with age, satiety);
   "Hitting your number" (2.2 g/kg/day, what that looks like in food,
   spreading it across meals).
3. **Fibre** 🥦 — "The fibre effect" (gut microbiome, cholesterol, 30 g/day);
   "Fibre every day" (practical swaps, variety of plants).
4. **Water** 💧 — "Drink enough" (how much, signs of dehydration);
   "Time it right" (stop a few hours before bed so sleep isn't interrupted —
   ties back to the sleep unit).
5. **Movement** 🚶 — "Every move counts" (any activity beats none, 150 min/wk);
   "Strength twice a week" (why resistance work, ties to protein).

British English throughout ("fibre"), warm non-clinical tone matching the rest
of the app, short sentences, no medical jargon.

## Data & API

New table `lesson_progress`: id uuid PK, patient_id FK cascade, lesson_id text,
correct_count int, total_count int, completed_at timestamptz default now,
unique (patient_id, lesson_id), index on patient_id. Same text-not-enum style
as the rest of the schema. Applied with `db:push` (additive — safe on a shared
dev database).

New route file `api/src/routes/learn.ts`, mounted at `/api/patients` (paths are
patient-scoped so the web client's stale-patient sign-out logic applies):

- `GET /api/patients/:id/learn` → `{ progress: LessonProgressEntry[] }`
- `POST /api/patients/:id/learn/:lessonId/complete` body
  `{ correct: number, total: number }` → upserts, returns the entry.
  `lessonId` validated as a slug (`/^[a-z0-9-]{1,64}$/`) — the API deliberately
  doesn't know the content catalogue.

Types added to `api/src/types.ts` **and mirrored by hand** into
`web/src/lib/types.ts`: `LessonProgressEntry { lessonId, correctCount,
totalCount, completedAt }`, `LearnProgressResponse`, `CompleteLessonBody`,
`CompleteLessonResponse`.

Seed: Priya completes the first three lessons (sleep unit + first protein
lesson) so the demo lands mid-track with the path partially lit.

## Web UI

- **Learn tab** added to the bottom nav (GraduationCap icon, `grid-cols-5` →
  `grid-cols-6`).
- **`/learn`** (`pages/Learn.tsx`): PageHeader with XP + lessons-done chips,
  then the track as a vertical path — one section per unit, each lesson a
  large tappable node (done ✓ / next ▶ highlighted in accent amber / locked 🔒
  non-interactive). Node states derive from stored progress + sequential
  unlock in `features/learn/useLearn.ts`.
- **`/learn/:lessonId`** (`pages/Lesson.tsx`): immersive player, tab bar
  hidden (AppLayout gains a `pathname.startsWith("/learn/")` case). Thin
  progress bar up top, one step at a time. Info steps: emoji + copy +
  Continue. Choice steps: options as big buttons → Check → correct (brand
  green) or not (danger red) with the explanation shown either way →
  Continue. Final screen: score, +10 XP, Back to learning. POST
  complete fires on the final screen; a failed POST shows a retry, and
  Back never blocks on it.
  Locked or unknown lesson ids redirect back to `/learn`.
- Follows existing components (PageHeader, Card, Button, Chip, EmptyState)
  and the token palette; 44px targets, 17px base type, visible focus.

## Error handling

Same patterns as the rest of the app: `useAsync`-style hook with loading
skeleton, EmptyState + retry on fetch failure, ApiError messages surfaced
verbatim. Progress POST is fire-with-retry on the completion screen only.

## Testing

No test suite exists (per README). Verification: `bun run typecheck`, then a
manual Playwright pass — load Priya, open Learn, confirm three lessons done,
play the next lesson end-to-end including a wrong answer, confirm progress
persists after reload.
