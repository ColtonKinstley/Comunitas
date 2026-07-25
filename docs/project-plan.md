# Comunitas — Project Plan

> Status: early ideation. This is a **product brief**, not a technical design.
> Tech stack, app surface, and ML approach are deliberately undecided.

## Problem

Most GP prescriptions and almost all preventative medicine aren't drugs — they
are lifestyle interventions. Today the patient gets a pamphlet and is sent on
their way. Program design, adherence, and support are left entirely to the
patient, despite adherence being critical to their acute and long-term health.

## Product thesis

**Invert the meetup model: the group is decided first, the event is chosen to
match the group.**

Patients don't browse a directory of activities and hope someone shows up.
Comunitas forms a small group of compatible people — similar health conditions,
goals, starting fitness, and geography — and then an AI agent plans events that
fit that group. No single person is responsible for organizing anything.

## Core loop

1. **Induction** — an AI interviewer (voice-first) has a natural conversation
   with a new patient to discover their health conditions, goals, starting
   fitness, interests, availability, and constraints (mobility, transport,
   confidence). Output: a structured patient profile. No forms.
2. **Matching** — the matching engine forms pods (roughly 5–8 people) from
   compatible profiles: condition and goal alignment first, then geography,
   fitness level, interests, and schedule overlap. Pods start together, like a
   program cohort, rather than joining something already in motion.
3. **Event planning** — an AI booking agent chooses or creates an event for the
   pod: discovered from what's already popular and available locally, or
   organized ad-hoc when nothing suitable exists. The agent handles proposal,
   scheduling, and logistics.
4. **Support** — the agent stays with the pod: confirmations, nudges,
   check-ins, and rescheduling. Adherence support is a behavior of the agent,
   not a separate feature.

## Components

### 1. AI induction interviewer (voice-first)

A conversational intake instead of a questionnaire. Voice lowers the barrier
for the actual demographic (lifestyle-prescription patients skew older and
less digitally engaged) and surfaces things forms miss — interests, anxieties,
what they've tried before. Produces the structured profile the matcher runs on.

### 2. Pod matching engine

The defensible core. Matches patients to *each other* on existing health
conditions, lifestyle goals, starting fitness state, location, and interests.
Group-first: the output is a cohort, not a search result. The matching method
is an open design question (rules, embeddings, ML) — start simple, keep the
profile rich.

### 3. Agentic event planner

Takes a pod and produces a plan: what, where, when. Draws on the activity
discovery layer for existing options; falls back to creating ad-hoc events
(e.g., a walk with a set route and meeting point) when nothing fits. Owns the
organizational overhead end-to-end so the group never needs an organizer.

Boundary: the agent plans **activities**, it does not give medical advice.

### 4. Activity discovery (data layer)

The substrate the planner draws from: what's popular and available nearby.
Candidate sources: parkrun, Open Referral UK feeds, council leisure listings,
Meetup/Eventbrite-style public events. Least glamorous, most load-bearing —
without it the agent has nothing to book.

## Stretch goal: GP integration (distribution)

The referral is the top of the funnel and the distribution strategy. Instead
of a pamphlet, the GP "prescribes" Comunitas: the referral seeds the patient
profile (conditions, goals) so induction starts warm. Long-term this is an
EHR integration (Juno EHR is a natural first target); for now it can be
mocked with a simple referral hand-off.

"Prescription in, community out" is the one-sentence pitch.

## Explicitly undecided (on purpose)

- Tech stack, hosting, and languages
- App surface (native app, web, WhatsApp/SMS, phone call) — voice induction
  suggests low-friction surfaces, but nothing is locked in
- Matching approach (rules vs. embeddings vs. trained model)
- How ad-hoc events are supervised/moderated

## Open questions

- What does the minimum lovable demo look like — how much of the loop must be
  real vs. staged?
- Pod size, formation cadence, and what happens when someone drops out
- Safeguarding: meeting strangers around health conditions needs care
  (identity, venue choice, data privacy for health information)
- How much health data do we hold, and where (privacy/GDPR posture)
