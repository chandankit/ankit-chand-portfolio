"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AgentEvent, Answer, ChatTurn, LlmEngine, Persona, PersonaId } from "@/lib/assistant/types.ts";
import { loadRuntime, ServerProxyEngine, type AssistantRuntime } from "@/lib/assistant/browser/runtime.ts";
import { shouldAutoLoadEmbeddings, type EmbedderStatus } from "@/lib/assistant/browser/embedder.ts";
import { detectWebGpu, isModelCached, WebLlmEngine, type WebGpuSupport } from "@/lib/assistant/browser/webllm-engine.ts";
import { DEFAULT_BROWSER_MODEL_ID, modelById } from "@/lib/assistant/models.ts";
import { MODES, MODE_EVENT, useMode, type ModeId } from "@/components/modes";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  answer?: Answer;
  events?: AgentEvent[];
  streaming?: string;
  pending?: boolean;
  error?: string;
};

export type EngineState =
  | { kind: "instant" }
  | { kind: "loading"; modelId: string; progress: number; text: string }
  | { kind: "ready"; engine: LlmEngine; source: "browser" | "server" }
  | { kind: "error"; message: string };

type Ctx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  messages: ChatMessage[];
  ask: (q: string) => void;
  stop: () => void;
  clear: () => void;
  busy: boolean;
  persona: Persona | null;
  personas: Persona[];
  setPersona: (id: PersonaId) => void;
  welcome: string;
  runtime: "idle" | "loading" | "ready" | "error";
  embedder: EmbedderStatus;
  engine: EngineState;
  webgpu: WebGpuSupport | null;
  serverModel: string | null;
  enableBrowserModel: (modelId: string) => void;
  disableModel: () => void;
  selectedModelId: string;
};

const AssistantContext = createContext<Ctx | null>(null);
export function useAssistant() {
  const c = useContext(AssistantContext);
  if (!c) throw new Error("useAssistant must be used inside <AssistantProvider>");
  return c;
}

const STORE_KEY = "ask-ankit:session";
const MODEL_KEY = "ask-ankit:model";
const read = <T,>(k: string, store: Storage | undefined, fallback: T): T => {
  try {
    const v = store?.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (k: string, v: unknown, store: Storage | undefined) => {
  try {
    store?.setItem(k, JSON.stringify(v));
  } catch {
    /* storage unavailable (private mode quota etc.) — session-only memory still works */
  }
};
const uid = () => Math.random().toString(36).slice(2, 10);

export function AssistantProvider({ children, defaultPersona = "overview" }: { children: ReactNode; defaultPersona?: PersonaId }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpenState] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [personaId, setPersonaId] = useState<PersonaId>(defaultPersona);
  const [rt, setRt] = useState<AssistantRuntime | null>(null);
  const [runtimeState, setRuntimeState] = useState<Ctx["runtime"]>("idle");
  const [embedder, setEmbedder] = useState<EmbedderStatus>("idle");
  const [engine, setEngine] = useState<EngineState>({ kind: "instant" });
  const [webgpu, setWebgpu] = useState<WebGpuSupport | null>(null);
  const [serverModel, setServerModel] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_BROWSER_MODEL_ID);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const engineRef = useRef<EngineState>(engine);
  engineRef.current = engine;
  const { mode, setMode } = useMode();

  // The six interaction modes ARE assistant personas, kept in sync both ways:
  //  • on load, the restored mode sets the persona (unless a conversation is restored);
  //  • an explicit mode switch always sets the persona, even mid-conversation;
  //  • picking a mode persona in the assistant switches the site's view (choosePersona).
  useEffect(() => {
    const m = MODES.find((x) => x.id === mode);
    if (m && messages.length === 0) setPersonaId(m.persona);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);
  useEffect(() => {
    const onMode = (e: Event) => {
      const m = MODES.find((x) => x.id === (e as CustomEvent<ModeId>).detail);
      if (m) setPersonaId(m.persona);
    };
    window.addEventListener(MODE_EVENT, onMode);
    return () => window.removeEventListener(MODE_EVENT, onMode);
  }, []);
  const choosePersona = useCallback(
    (id: PersonaId) => {
      setPersonaId(id);
      const m = MODES.find((x) => x.persona === id);
      if (m && m.id !== mode) setMode(m.id);
    },
    [mode, setMode],
  );

  // Restore this tab's conversation (session-scoped: nothing leaves the browser).
  useEffect(() => {
    const s = read<{ messages: ChatMessage[]; persona: PersonaId } | null>(STORE_KEY, globalThis.sessionStorage, null);
    if (s) {
      setMessages(s.messages.filter((m) => !m.pending));
      setPersonaId(s.persona);
    }
    setSelectedModelId(read(MODEL_KEY, globalThis.localStorage, DEFAULT_BROWSER_MODEL_ID));
  }, []);
  useEffect(() => {
    if (!busy) write(STORE_KEY, { messages: messages.slice(-30), persona: personaId }, globalThis.sessionStorage);
  }, [messages, personaId, busy]);

  const ensureRuntime = useCallback(async () => {
    if (rt) return rt;
    setRuntimeState("loading");
    try {
      const r = await loadRuntime();
      r.embedder.onStatus = setEmbedder;
      setRt(r);
      setRuntimeState("ready");
      if (shouldAutoLoadEmbeddings()) r.embedder.warmup();
      return r;
    } catch {
      setRuntimeState("error");
      return null;
    }
  }, [rt]);

  // Prefetch the (small) knowledge base when the browser is idle.
  useEffect(() => {
    const idle = (globalThis as typeof globalThis & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const t = idle ? idle(() => void ensureRuntime()) : setTimeout(() => void ensureRuntime(), 3000);
    return () => {
      if (!idle) clearTimeout(t as ReturnType<typeof setTimeout>);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Discover inference options once: self-hosted server tier, WebGPU, cached browser model.
  const probed = useRef(false);
  const probe = useCallback(async () => {
    if (probed.current) return;
    probed.current = true;
    try {
      const s = await fetch("/api/assistant/status", { cache: "no-store" }).then((r) => r.json());
      if (s?.server?.healthy && s.server.model) {
        setServerModel(s.server.model);
        setEngine({ kind: "ready", engine: new ServerProxyEngine(s.server.model), source: "server" });
        return;
      }
    } catch {
      /* status endpoint unreachable — browser tiers only */
    }
    const g = await detectWebGpu();
    setWebgpu(g);
    const preferred = read(MODEL_KEY, globalThis.localStorage, "");
    if (g.ok && preferred && (await isModelCached(preferred))) loadBrowserModel(preferred);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBrowserModel = useCallback(async (modelId: string) => {
    setEngine({ kind: "loading", modelId, progress: 0, text: "Preparing…" });
    try {
      const e = await WebLlmEngine.create(modelId, ({ progress, text }) => setEngine({ kind: "loading", modelId, progress, text }));
      setEngine({ kind: "ready", engine: e, source: "browser" });
      write(MODEL_KEY, modelId, globalThis.localStorage);
      // the on-device model is worth pairing with semantic retrieval
      rt?.embedder.warmup();
    } catch (err) {
      setEngine({ kind: "error", message: `Couldn't start the on-device model: ${String((err as Error)?.message ?? err).slice(0, 160)}` });
    }
  }, [rt]);

  const enableBrowserModel = useCallback(
    (modelId: string) => {
      const spec = modelById(modelId);
      const id = webgpu && webgpu.ok && !webgpu.f16 && spec ? spec.f32Id : modelId;
      setSelectedModelId(modelId);
      void loadBrowserModel(id);
    },
    [loadBrowserModel, webgpu],
  );

  const disableModel = useCallback(() => {
    const e = engineRef.current;
    if (e.kind === "ready" && e.engine instanceof WebLlmEngine) void e.engine.unload();
    write(MODEL_KEY, "", globalThis.localStorage);
    setEngine({ kind: "instant" });
  }, []);

  const setOpen = useCallback(
    (v: boolean) => {
      setOpenState(v);
      if (v) {
        void ensureRuntime();
        void probe();
      }
    },
    [ensureRuntime, probe],
  );

  // Opening the full-page view also initialises everything.
  useEffect(() => {
    if (pathname === "/ask") {
      void ensureRuntime();
      void probe();
    }
  }, [pathname, ensureRuntime, probe]);

  const personas = rt?.payload.personas ?? [];
  const persona = personas.find((p) => p.id === personaId) ?? null;

  const ask = useCallback(
    async (q: string) => {
      const question = q.trim();
      if (!question || busy) return;
      const r = await ensureRuntime();
      const userMsg: ChatMessage = { id: uid(), role: "user", content: question };
      const pendingId = uid();
      const history: ChatTurn[] = messages
        .filter((m) => !m.pending && !m.error)
        .map((m) => ({ role: m.role, content: m.role === "assistant" ? (m.answer?.text ?? m.content) : m.content, entities: m.answer?.entities }));
      setMessages((ms) => [...ms, userMsg, { id: pendingId, role: "assistant", content: "", pending: true, events: [], streaming: "" }]);
      if (!r) {
        setMessages((ms) => ms.map((m) => (m.id === pendingId ? { ...m, pending: false, error: "The assistant couldn't load its knowledge base. Check your connection and try again — the rest of the portfolio works normally." } : m)));
        return;
      }
      setBusy(true);
      const ac = new AbortController();
      abortRef.current = ac;
      const e = engineRef.current;
      try {
        const answer = await r.ask(question, history, {
          llm: e.kind === "ready" ? e.engine : null,
          persona,
          signal: ac.signal,
          onEvent: (ev) =>
            setMessages((ms) =>
              ms.map((m) => (m.id !== pendingId ? m : ev.type === "token" ? { ...m, streaming: (m.streaming ?? "") + ev.delta } : { ...m, events: [...(m.events ?? []), ev] })),
            ),
        });
        setMessages((ms) => ms.map((m) => (m.id === pendingId ? { ...m, pending: false, streaming: undefined, content: answer.text, answer } : m)));
        // A model that stopped responding is switched off (and not auto-loaded next visit),
        // so later questions don't each wait for the watchdog.
        if (e.kind === "ready" && e.engine instanceof WebLlmEngine && e.engine.stalled) {
          void e.engine.unload().catch(() => {});
          write(MODEL_KEY, "", globalThis.localStorage);
          setEngine({ kind: "error", message: "The on-device model stopped responding on this device, so answers are back in instant mode (still verified). You can try a different model." });
        }
        const auto = answer.actions.find((a) => a.auto && a.kind === "navigate");
        if (auto) router.push(auto.href);
      } catch (err) {
        const aborted = (err as Error)?.name === "AbortError";
        setMessages((ms) => ms.map((m) => (m.id === pendingId ? { ...m, pending: false, streaming: undefined, error: aborted ? "Stopped." : "Something went wrong while answering. Please try again." } : m)));
      } finally {
        setBusy(false);
        abortRef.current = null;
      }
    },
    [busy, ensureRuntime, messages, persona, router],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);
  const clear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    write(STORE_KEY, null, globalThis.sessionStorage);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      open,
      setOpen,
      messages,
      ask: (q) => void ask(q),
      stop,
      clear,
      busy,
      persona,
      personas,
      setPersona: choosePersona,
      welcome: rt?.payload.welcome ?? "Hi! I'm the portfolio assistant. Ask me anything about Ankit's experience, projects, skills or certifications.",
      runtime: runtimeState,
      embedder,
      engine,
      webgpu,
      serverModel,
      enableBrowserModel,
      disableModel,
      selectedModelId,
    }),
    [open, setOpen, messages, ask, stop, clear, busy, persona, personas, choosePersona, rt, runtimeState, embedder, engine, webgpu, serverModel, enableBrowserModel, disableModel, selectedModelId],
  );
  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}
