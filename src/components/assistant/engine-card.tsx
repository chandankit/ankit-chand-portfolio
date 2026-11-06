"use client";

import { useState } from "react";
import { Cpu, LoaderCircle, Server, ShieldCheck, Zap } from "lucide-react";
import { BROWSER_MODELS, modelById } from "@/lib/assistant/models.ts";
import { cn } from "@/lib/format";
import { useAssistant } from "./assistant-provider";

/** Shows which inference tier is active and lets the visitor opt into on-device AI. */
export function EngineCard({ compact = false }: { compact?: boolean }) {
  const { engine, webgpu, enableBrowserModel, disableModel, selectedModelId, embedder } = useAssistant();
  const [choice, setChoice] = useState(selectedModelId);
  const spec = modelById(choice);

  if (engine.kind === "ready")
    return (
      <div className="flex items-center gap-2 rounded-xl border border-teal/30 bg-teal/10 px-3 py-2 text-xs text-fg">
        {engine.source === "server" ? <Server className="size-3.5 text-teal" aria-hidden /> : <Cpu className="size-3.5 text-teal" aria-hidden />}
        <span className="flex-1">
          AI answers on · <span className="font-medium">{engine.engine.label}</span>
        </span>
        {engine.source === "browser" && (
          <button type="button" onClick={disableModel} className="text-subtle underline-offset-2 hover:text-fg hover:underline">
            Turn off
          </button>
        )}
      </div>
    );

  if (engine.kind === "loading")
    return (
      <div className="rounded-xl border border-line bg-surface px-3 py-2.5 text-xs" role="status">
        <div className="flex items-center gap-2 text-fg">
          <LoaderCircle className="size-3.5 animate-spin text-indigo" aria-hidden /> Loading {modelById(engine.modelId)?.name ?? "model"} on your device… {(engine.progress * 100).toFixed(0)}%
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-strong">
          <div className="h-full bg-gradient-brand transition-all" style={{ width: `${Math.max(3, engine.progress * 100)}%` }} />
        </div>
        <p className="mt-1.5 truncate text-subtle">{engine.text}</p>
        <p className="mt-1 text-subtle">You can keep asking — instant answers work while it downloads.</p>
      </div>
    );

  return (
    <div className={cn("rounded-xl border border-line bg-surface px-3 py-2.5 text-xs", compact && "py-2")}>
      <p className="flex items-center gap-1.5 text-fg">
        <Zap className="size-3.5 text-amber" aria-hidden />
        <span className="font-medium">Instant answers</span>
        <span className="text-subtle">— retrieved from the portfolio{embedder === "ready" ? " with semantic search" : ""}, verified, no AI model needed.</span>
      </p>
      {engine.kind === "error" && <p className="mt-1.5 text-rose">{engine.message}</p>}
      {webgpu?.ok ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="model-choice">
            On-device model
          </label>
          <select id="model-choice" value={choice} onChange={(e) => setChoice(e.target.value)} className="rounded-lg border border-line bg-elev px-2 py-1 text-xs text-fg">
            {BROWSER_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} · ~{m.downloadMB >= 1000 ? `${(m.downloadMB / 1000).toFixed(1)} GB` : `${m.downloadMB} MB`}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => enableBrowserModel(choice)} className="rounded-full bg-fg px-3 py-1 font-semibold text-bg hover:opacity-90">
            Turn on AI answers
          </button>
          {!compact && spec && (
            <p className="w-full text-subtle">
              <ShieldCheck className="mr-1 inline size-3 text-teal" aria-hidden />
              Runs the open-weight {spec.name} ({spec.license}) on your GPU. One-time download, cached for next time; your questions never leave this device.
            </p>
          )}
        </div>
      ) : webgpu && !webgpu.ok ? (
        <p className="mt-1.5 text-subtle">On-device AI needs WebGPU: {webgpu.reason}</p>
      ) : null}
    </div>
  );
}
