/**
 * The voice induction engine.
 *
 * Mints an ephemeral secret from our API, opens a WebRTC peer connection
 * straight to OpenAI's Realtime API, and translates the `oai-events` data
 * channel into React state: captions, a live profile draft, speaking
 * indicators, and the two tool calls the interviewer can make.
 *
 * Everything volatile lives in refs — the data channel fires far faster than
 * React re-renders, and a stale closure mid-conversation would lose a tool
 * call. State is a projection of the refs, updated as things land.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  appendTranscript,
  completeInduction,
  createRealtimeSession,
  updateProfile,
} from "../../lib/api";
import { setCurrentPatientId } from "../../lib/patient";
import type { PatientProfile, TranscriptEntry, UpdateProfileBody } from "../../lib/types";
import { isEmptyPatch, sanitizeProfilePatch } from "./sanitize";
import type { Caption, CompletionResult, Mode, Phase, ProfileState } from "./types";

const CALLS_URL = "https://api.openai.com/v1/realtime/calls";

/** How often finalised captions are pushed to `induction_sessions.transcript`. */
const TRANSCRIPT_FLUSH_MS = 5000;

/**
 * Safety net for a model that keeps calling tools without asking anything:
 * after this many tool rounds with no user turn we stop auto-prompting it.
 */
const MAX_AUTO_TURNS = 8;

/** Long enough for the "finding your group" beat to read as deliberate. */
const REVEAL_DELAY_MS = 1200;

type ServerEvent = Record<string, unknown> & { type?: unknown };

const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

const emptyProfile = (): ProfileState => ({ draft: {}, versions: {} });

/** Which draft keys a given patch touched — used to animate only those rows. */
const FIELD_GROUPS: Record<string, string[]> = {
  name: ["name"],
  ageBand: ["ageBand"],
  location: ["postcode", "lat", "lng"],
  travel: ["travelRadiusKm", "transportModes"],
  conditions: ["conditions"],
  goals: ["goals"],
  fitness: ["fitnessLevel", "fitnessNotes"],
  interests: ["interests"],
  availability: ["availability"],
  constraints: ["mobilityNotes", "confidenceLevel"],
};

function touchedGroups(patch: Record<string, unknown>): string[] {
  const keys = Object.keys(patch);
  return Object.entries(FIELD_GROUPS)
    .filter(([, fields]) => fields.some((f) => keys.includes(f)))
    .map(([group]) => group);
}

export interface UseInductionOptions {
  /** Where remote audio is piped. Rendered by the page as `<audio autoPlay />`. */
  audioRef: React.RefObject<HTMLAudioElement | null>;
  initialMode: Mode;
}

export function useInduction({ audioRef, initialMode }: UseInductionOptions) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [mode, setMode] = useState<Mode>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [profile, setProfile] = useState<ProfileState>(emptyProfile);
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [completion, setCompletion] = useState<CompletionResult | null>(null);
  /** Bumps on every applied tool call — the profile card flashes on change. */
  const [savedCount, setSavedCount] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micRef = useRef<MediaStream | null>(null);

  const patientIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const draftRef = useRef<UpdateProfileBody>({});

  const activeResponseRef = useRef(false);
  const pendingResponseRef = useRef(false);
  const autoTurnsRef = useRef(0);
  /** item_id → the function call announced by `response.output_item.added`. */
  const callsRef = useRef(new Map<string, { name: string; callId: string }>());
  const completedRef = useRef(false);
  const teardownRef = useRef<(() => void) | null>(null);

  const bufferRef = useRef<TranscriptEntry[]>([]);
  const flushingRef = useRef(false);

  /* ------------------------------------------------------------ plumbing */

  const send = useCallback((event: unknown) => {
    const dc = dcRef.current;
    if (dc && dc.readyState === "open") dc.send(JSON.stringify(event));
  }, []);

  /** `response.create`, but never while one is already running. */
  const requestResponse = useCallback(() => {
    if (autoTurnsRef.current >= MAX_AUTO_TURNS) return;
    autoTurnsRef.current += 1;
    if (activeResponseRef.current) {
      pendingResponseRef.current = true;
      return;
    }
    activeResponseRef.current = true;
    send({ type: "response.create" });
  }, [send]);

  const flushTranscript = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || flushingRef.current || bufferRef.current.length === 0) return;
    const entries = bufferRef.current;
    bufferRef.current = [];
    flushingRef.current = true;
    try {
      await appendTranscript(sessionId, entries);
    } catch {
      // Losing a line of transcript must never break the conversation.
    } finally {
      flushingRef.current = false;
    }
  }, []);

  const record = useCallback((role: "user" | "assistant", text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    bufferRef.current.push({ role, text: trimmed, at: new Date().toISOString() });
  }, []);

  /* ------------------------------------------------------------ captions */

  const upsertCaption = useCallback(
    (id: string, role: "user" | "assistant", update: { delta?: string; text?: string; final?: boolean }) => {
      setCaptions((prev) => {
        const idx = prev.findIndex((c) => c.id === id);
        if (idx === -1) {
          return [
            ...prev,
            { id, role, text: update.text ?? update.delta ?? "", final: update.final ?? false },
          ];
        }
        const existing = prev[idx]!;
        const next: Caption = {
          ...existing,
          text: update.text ?? existing.text + (update.delta ?? ""),
          final: update.final ?? existing.final,
        };
        const copy = [...prev];
        copy[idx] = next;
        return copy;
      });
    },
    [],
  );

  /* ------------------------------------------------------------- profile */

  const mergeDraft = useCallback((patch: Record<string, unknown>) => {
    draftRef.current = { ...draftRef.current, ...patch } as UpdateProfileBody;
    const groups = touchedGroups(patch);
    setProfile((prev) => {
      const versions = { ...prev.versions };
      for (const g of groups) versions[g] = (versions[g] ?? 0) + 1;
      return { draft: { ...prev.draft, ...patch }, versions };
    });
  }, []);

  /** Fold the server's canonical row back in — it carries the geocoded lat/lng. */
  const mergeServerProfile = useCallback(
    (patient: PatientProfile) => {
      mergeDraft({
        name: patient.name,
        ageBand: patient.ageBand,
        postcode: patient.postcode,
        lat: patient.lat,
        lng: patient.lng,
        travelRadiusKm: patient.travelRadiusKm,
        transportModes: patient.transportModes,
        mobilityNotes: patient.mobilityNotes,
        confidenceLevel: patient.confidenceLevel,
        fitnessLevel: patient.fitnessLevel,
        fitnessNotes: patient.fitnessNotes,
        availability: patient.availability,
        conditions: patient.conditions,
        goals: patient.goals,
        interests: patient.interests,
      });
    },
    [mergeDraft],
  );

  /* --------------------------------------------------------------- tools */

  const teardown = useCallback(() => {
    dcRef.current?.close();
    dcRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    micRef.current?.getTracks().forEach((t) => t.stop());
    micRef.current = null;
  }, []);
  teardownRef.current = teardown;

  const finish = useCallback(async () => {
    if (completedRef.current) return;
    completedRef.current = true;
    const patientId = patientIdRef.current;
    if (!patientId) return;

    setPhase("completing");
    const startedAt = Date.now();
    try {
      const result = await completeInduction(patientId);
      await flushTranscript();
      const sessionId = sessionIdRef.current;
      if (sessionId) {
        try {
          await appendTranscript(
            sessionId,
            [{ role: "system", text: "Induction complete", at: new Date().toISOString() }],
            "complete",
          );
        } catch {
          /* non-fatal */
        }
      }
      const wait = Math.max(0, REVEAL_DELAY_MS - (Date.now() - startedAt));
      if (wait) await new Promise((r) => setTimeout(r, wait));
      teardownRef.current?.();
      setCompletion({
        pod: result.pod,
        distanceKm: result.distanceKm,
        patientName: result.patient.name,
      });
      setPhase("complete");
    } catch (e) {
      completedRef.current = false;
      setError(e instanceof Error ? e.message : "Could not finish your induction.");
      setPhase("error");
    }
  }, [flushTranscript]);

  const runTool = useCallback(
    async (name: string, callId: string, rawArgs: string) => {
      let output: Record<string, unknown> = { ok: true };
      try {
        const args: unknown = rawArgs ? JSON.parse(rawArgs) : {};
        if (name === "update_profile") {
          const patch = sanitizeProfilePatch(args);
          if (!isEmptyPatch(patch)) {
            // Optimistic first: the card should fill in the instant the model
            // says it, not a round trip later.
            mergeDraft(patch as Record<string, unknown>);
            setSavedCount((n) => n + 1);
            const patientId = patientIdRef.current;
            if (patientId) {
              const res = await updateProfile(patientId, patch);
              mergeServerProfile(res.patient);
              if (res.warning) output = { ok: true, warning: res.warning };
            }
          }
        } else if (name === "complete_induction") {
          void finish();
        } else {
          output = { ok: false, error: `unknown tool ${name}` };
        }
      } catch (e) {
        output = { ok: false, error: e instanceof Error ? e.message : "tool failed" };
      }

      send({
        type: "conversation.item.create",
        item: { type: "function_call_output", call_id: callId, output: JSON.stringify(output) },
      });
      if (!completedRef.current) requestResponse();
    },
    [finish, mergeDraft, mergeServerProfile, requestResponse, send],
  );

  /* -------------------------------------------------------- event router */

  const handleEvent = useCallback(
    (event: ServerEvent) => {
      const type = str(event.type);
      if (!type) return;

      switch (type) {
        /* -------------------------------------------------- user speech */
        case "input_audio_buffer.speech_started":
          setUserSpeaking(true);
          autoTurnsRef.current = 0;
          break;
        case "input_audio_buffer.speech_stopped":
          setUserSpeaking(false);
          break;
        case "conversation.item.input_audio_transcription.delta": {
          const id = str(event.item_id);
          if (id) upsertCaption(id, "user", { delta: str(event.delta) ?? "" });
          break;
        }
        case "conversation.item.input_audio_transcription.completed": {
          const id = str(event.item_id);
          const text = str(event.transcript) ?? "";
          if (id) upsertCaption(id, "user", { text, final: true });
          record("user", text);
          break;
        }

        /* --------------------------------------------- assistant speech */
        case "response.created":
          activeResponseRef.current = true;
          setThinking(true);
          break;
        case "response.output_item.added": {
          const item = event.item as Record<string, unknown> | undefined;
          if (item && str(item.type) === "function_call") {
            const id = str(item.id);
            const name = str(item.name);
            const callId = str(item.call_id);
            if (id && name && callId) callsRef.current.set(id, { name, callId });
          }
          break;
        }
        case "response.output_audio_transcript.delta":
        case "response.audio_transcript.delta":
        case "response.output_text.delta": {
          const id = str(event.item_id);
          if (id) upsertCaption(id, "assistant", { delta: str(event.delta) ?? "" });
          setThinking(false);
          break;
        }
        case "response.output_audio_transcript.done":
        case "response.audio_transcript.done":
        case "response.output_text.done": {
          const id = str(event.item_id);
          const text = str(event.transcript) ?? str(event.text) ?? "";
          if (id && text) upsertCaption(id, "assistant", { text, final: true });
          if (text) record("assistant", text);
          break;
        }

        /* ---------------------------------------------- speaking states */
        case "output_audio_buffer.started":
          setAssistantSpeaking(true);
          setThinking(false);
          break;
        case "output_audio_buffer.stopped":
        case "output_audio_buffer.cleared":
          setAssistantSpeaking(false);
          break;

        /* ------------------------------------------------------- tools */
        case "response.function_call_arguments.done": {
          const itemId = str(event.item_id);
          const known = itemId ? callsRef.current.get(itemId) : undefined;
          const name = str(event.name) ?? known?.name;
          const callId = str(event.call_id) ?? known?.callId;
          const args = str(event.arguments) ?? "{}";
          if (name && callId) void runTool(name, callId, args);
          break;
        }

        /* ------------------------------------------------------- turns */
        case "response.done": {
          activeResponseRef.current = false;
          setThinking(false);
          if (pendingResponseRef.current) {
            pendingResponseRef.current = false;
            activeResponseRef.current = true;
            send({ type: "response.create" });
          }
          break;
        }

        case "error": {
          const err = event.error as Record<string, unknown> | undefined;
          console.warn("[induction] realtime error", err ?? event);
          break;
        }
        default:
          break;
      }
    },
    [record, runTool, send, upsertCaption],
  );

  /* ------------------------------------------------------------- connect */

  const connect = useCallback(async () => {
    setError(null);
    setCaptions([]);
    setProfile(emptyProfile());
    setCompletion(null);
    completedRef.current = false;
    autoTurnsRef.current = 0;
    callsRef.current.clear();
    draftRef.current = {};

    // Mic first: the ephemeral secret is short-lived, so it must be the last
    // thing we fetch before the SDP handshake.
    let stream: MediaStream | null = null;
    let useMic = mode === "voice";
    if (useMic) {
      setPhase("permission");
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        // No mic, or permission denied — drop into the typed fallback rather
        // than dead-ending the demo.
        useMic = false;
        setMode("text");
      }
    }
    micRef.current = stream;

    setPhase("connecting");
    try {
      const session = await createRealtimeSession(
        patientIdRef.current ? { patientId: patientIdRef.current } : {},
      );
      patientIdRef.current = session.patientId;
      sessionIdRef.current = session.sessionId;
      setCurrentPatientId(session.patientId);

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.ontrack = (e) => {
        const el = audioRef.current;
        if (el && e.streams[0]) el.srcObject = e.streams[0];
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") {
          setError("The connection dropped. Please try again.");
          setPhase("error");
        }
      };

      const track = stream?.getAudioTracks()[0];
      if (track && stream) pc.addTrack(track, stream);
      // Text mode still needs to *hear* the interviewer.
      else pc.addTransceiver("audio", { direction: "recvonly" });

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.addEventListener("message", (e) => {
        try {
          handleEvent(JSON.parse(e.data as string) as ServerEvent);
        } catch {
          /* ignore malformed frames */
        }
      });
      dc.addEventListener("open", () => {
        setPhase("live");
        // Nothing has been said yet, so nudge the interviewer to open.
        activeResponseRef.current = true;
        send({ type: "response.create" });
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const res = await fetch(CALLS_URL, {
        method: "POST",
        body: offer.sdp ?? "",
        headers: {
          Authorization: `Bearer ${session.value}`,
          "Content-Type": "application/sdp",
        },
      });
      if (!res.ok) {
        throw new Error(`OpenAI refused the call (${res.status})`);
      }
      await pc.setRemoteDescription({ type: "answer", sdp: await res.text() });
    } catch (e) {
      teardown();
      setError(
        e instanceof Error && e.message
          ? e.message
          : "We couldn't start the conversation. Please try again.",
      );
      setPhase("error");
    }
  }, [audioRef, handleEvent, mode, send, teardown]);

  /* --------------------------------------------------------------- input */

  /** Typed turn — same conversation, same tools, no microphone. */
  const sendText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || phase !== "live") return;
      autoTurnsRef.current = 0;
      upsertCaption(`local-${Date.now()}`, "user", { text: trimmed, final: true });
      record("user", trimmed);
      send({
        type: "conversation.item.create",
        item: { type: "message", role: "user", content: [{ type: "input_text", text: trimmed }] },
      });
      requestResponse();
    },
    [phase, record, requestResponse, send, upsertCaption],
  );

  const start = useCallback(() => void connect(), [connect]);

  const retry = useCallback(() => {
    teardown();
    void connect();
  }, [connect, teardown]);

  const switchToText = useCallback(() => setMode("text"), []);

  /* ------------------------------------------------------------ lifecycle */

  useEffect(() => {
    const timer = window.setInterval(() => void flushTranscript(), TRANSCRIPT_FLUSH_MS);
    return () => window.clearInterval(timer);
  }, [flushTranscript]);

  useEffect(() => () => teardownRef.current?.(), []);

  return {
    phase,
    mode,
    error,
    captions,
    profile,
    assistantSpeaking,
    userSpeaking,
    thinking,
    completion,
    savedCount,
    patientId: patientIdRef.current,
    start,
    retry,
    sendText,
    switchToText,
  };
}
