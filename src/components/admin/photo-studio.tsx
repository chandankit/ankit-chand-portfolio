"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Download, ImagePlus, LoaderCircle, LogOut, RotateCcw, Upload, WandSparkles, X, ZoomIn } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { cn } from "@/lib/format";

type Props = { current: string | null; limits: { maxMB: number; minSide: number }; enhancerConfigured: boolean; publishConfigured: boolean };
const OUT = 800; // exported square size (px)
const ACCEPT = ["image/jpeg", "image/png", "image/webp"];

export function PhotoStudio({ current, limits, enhancerConfigured, publishConfigured }: Props) {
  const router = useRouter();
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [source, setSource] = useState<"original" | "enhanced">("original");
  const [enhanced, setEnhanced] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [ox, setOx] = useState(0);
  const [oy, setOy] = useState(0);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState<"enhance" | "publish" | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const active = source === "enhanced" && enhanced ? enhanced : img;

  const load = (file: File) => {
    setMsg(null);
    setApproved(false);
    setEnhanced(null);
    setSource("original");
    if (!ACCEPT.includes(file.type)) return setMsg({ kind: "err", text: "Use a JPEG, PNG or WebP image (SVG and other formats are not accepted)." });
    if (file.size > limits.maxMB * 1048576) return setMsg({ kind: "err", text: `The file is larger than ${limits.maxMB} MB.` });
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      if (Math.min(im.naturalWidth, im.naturalHeight) < limits.minSide) {
        URL.revokeObjectURL(url);
        return setMsg({ kind: "err", text: `The image is ${im.naturalWidth}×${im.naturalHeight}; at least ${limits.minSide}×${limits.minSide} is needed for a sharp result.` });
      }
      setImg(im);
      setZoom(1);
      setOx(0);
      setOy(0);
      setMsg({ kind: "info", text: `Loaded ${im.naturalWidth}×${im.naturalHeight}. Adjust the crop, then approve.` });
    };
    im.onerror = () => setMsg({ kind: "err", text: "That file couldn't be read as an image." });
    im.src = url;
  };

  // Render the square crop to a canvas and export a JPEG preview.
  const render = useCallback(() => {
    const c = canvasRef.current;
    if (!c || !active) return;
    c.width = OUT;
    c.height = OUT;
    const ctx = c.getContext("2d")!;
    const side = Math.min(active.naturalWidth, active.naturalHeight) / zoom;
    const cx = active.naturalWidth / 2 + (ox / 100) * (active.naturalWidth - side) * 0.5;
    const cy = active.naturalHeight / 2 + (oy / 100) * (active.naturalHeight - side) * 0.5;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, OUT, OUT);
    ctx.drawImage(active, cx - side / 2, cy - side / 2, side, side, 0, 0, OUT, OUT);
    setExportUrl(c.toDataURL("image/jpeg", 0.9));
  }, [active, zoom, ox, oy]);
  useEffect(() => {
    render();
    setApproved(false);
  }, [render]);

  const exportBlob = () => new Promise<Blob>((res, rej) => canvasRef.current?.toBlob((b) => (b ? res(b) : rej(new Error("export failed"))), "image/jpeg", 0.9));

  const enhance = async () => {
    setBusy("enhance");
    setMsg(null);
    try {
      const r = await fetch("/api/admin/photo?action=enhance", { method: "POST", body: await exportBlob() });
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? `Enhancement failed (${r.status}).`);
      const url = URL.createObjectURL(await r.blob());
      const im = new Image();
      im.onload = () => {
        setEnhanced(im);
        setSource("enhanced");
        setMsg({ kind: "ok", text: "Enhanced version ready — compare it with the original before approving." });
      };
      im.src = url;
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const publish = async () => {
    setBusy("publish");
    setMsg(null);
    try {
      const r = await fetch("/api/admin/photo?action=publish&confirm=true", { method: "POST", body: await exportBlob() });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error ?? `Publishing failed (${r.status}).`);
      setMsg({ kind: "ok", text: `Published. The site redeploys automatically from the new commit${j?.commit ? `: ${j.commit}` : "."}` });
      setConfirmText("");
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const remove = () => {
    setImg(null);
    setEnhanced(null);
    setExportUrl(null);
    setApproved(false);
    setMsg(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) load(f);
          }}
          className={cn("card grid min-h-72 place-items-center border-dashed p-6 text-center", img && "p-4")}
        >
          {img ? (
            <div className="w-full space-y-4">
              <div className="mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-white">{exportUrl && <img src={exportUrl} alt="Square crop preview" className="size-full object-cover" />}</div>
              <div className="grid gap-3 text-xs text-muted sm:grid-cols-3">
                <label className="space-y-1">
                  <span className="flex items-center gap-1">
                    <ZoomIn className="size-3.5" aria-hidden /> Zoom {zoom.toFixed(2)}×
                  </span>
                  <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full" />
                </label>
                <label className="space-y-1">
                  <span>Horizontal</span>
                  <input type="range" min={-100} max={100} value={ox} onChange={(e) => setOx(Number(e.target.value))} className="w-full" />
                </label>
                <label className="space-y-1">
                  <span>Vertical</span>
                  <input type="range" min={-100} max={100} value={oy} onChange={(e) => setOy(Number(e.target.value))} className="w-full" />
                </label>
              </div>
              {enhanced && (
                <div role="radiogroup" aria-label="Version" className="flex justify-center gap-2 text-xs">
                  {(["original", "enhanced"] as const).map((v) => (
                    <button key={v} type="button" role="radio" aria-checked={source === v} onClick={() => setSource(v)} className={cn("rounded-full border px-3 py-1", source === v ? "border-transparent bg-fg text-bg" : "border-line text-muted")}>
                      {v === "original" ? "Original" : "Enhanced"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <ImagePlus className="mx-auto size-10 text-subtle" aria-hidden />
              <p className="font-medium text-fg">Drop a photo here, or choose a file</p>
              <p className="text-xs text-subtle">
                JPEG, PNG or WebP · at least {limits.minSide}×{limits.minSide} px · up to {limits.maxMB} MB · square or portrait, face centred, plain background
              </p>
            </div>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" aria-hidden />
        <input ref={fileRef} type="file" accept={ACCEPT.join(",")} className="sr-only" id="photo-file" onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
        <div className="flex flex-wrap gap-2">
          <label htmlFor="photo-file" className={buttonClass("primary", "cursor-pointer")}>
            <Upload className="size-4" aria-hidden /> {img ? "Replace photo" : "Upload photo"}
          </label>
          {img && (
            <>
              <button type="button" onClick={() => { setZoom(1); setOx(0); setOy(0); }} className={buttonClass("ghost")}>
                <RotateCcw className="size-4" aria-hidden /> Reset crop
              </button>
              <button type="button" onClick={remove} className={buttonClass("ghost")}>
                <X className="size-4" aria-hidden /> Remove
              </button>
            </>
          )}
        </div>
        {msg && (
          <p role={msg.kind === "err" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-sm", msg.kind === "err" ? "border-rose/40 bg-rose/10 text-fg" : msg.kind === "ok" ? "border-teal/40 bg-teal/10 text-fg" : "border-line bg-surface text-muted")}>
            {msg.text}
          </p>
        )}
      </div>

      <aside className="space-y-5">
        <div className="card space-y-4 p-5">
          <p className="text-sm font-semibold text-fg">Previews</p>
          <div className="flex items-center gap-4">
            <div className="size-24 overflow-hidden rounded-full border-2 border-indigo/60 bg-elev">{(exportUrl ?? current) && <img src={exportUrl ?? current!} alt="Circular preview (hero)" className="size-full object-cover" />}</div>
            <div className="size-16 overflow-hidden rounded-xl border border-line bg-elev">{(exportUrl ?? current) && <img src={exportUrl ?? current!} alt="Square preview (about page)" className="size-full object-cover" />}</div>
            <div className="size-9 overflow-hidden rounded-full border border-line bg-elev">{(exportUrl ?? current) && <img src={exportUrl ?? current!} alt="Small preview (avatar)" className="size-full object-cover" />}</div>
          </div>
          <p className="text-xs text-subtle">{exportUrl ? "Showing your new crop." : current ? "Showing the photo that is live now." : "No photo is live — the site shows the placeholder."}</p>
        </div>

        <div className="card space-y-3 p-5 text-sm">
          <p className="font-semibold text-fg">1 · Enhance (optional)</p>
          <p className="text-xs text-muted">Background removal, upscaling or lighting correction by a self-hosted open-source service.</p>
          <button type="button" disabled={!img || busy !== null || !enhancerConfigured} onClick={enhance} className={buttonClass("ghost", "w-full")}>
            {busy === "enhance" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <WandSparkles className="size-4" aria-hidden />} Request enhancement
          </button>
          {!enhancerConfigured && <p className="text-xs text-subtle">Not connected — set PHOTO_ENHANCER_URL to enable.</p>}
        </div>

        <div className="card space-y-3 p-5 text-sm">
          <p className="font-semibold text-fg">2 · Approve</p>
          <label className="flex items-start gap-2 text-xs text-muted">
            <input type="checkbox" checked={approved} disabled={!exportUrl} onChange={(e) => setApproved(e.target.checked)} className="mt-0.5" />I have checked this crop and approve it as the public profile photo.
          </label>
          {exportUrl && (
            <a href={exportUrl} download="ankit-chand.jpg" className={buttonClass("ghost", "w-full")}>
              <Download className="size-4" aria-hidden /> Download approved image
            </a>
          )}
        </div>

        <div className="card space-y-3 p-5 text-sm">
          <p className="font-semibold text-fg">3 · Publish</p>
          <p className="text-xs text-muted">Commits the image to the repository; the normal deploy then updates the site. Type PUBLISH to confirm.</p>
          <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="PUBLISH" aria-label="Type PUBLISH to confirm" className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-fg outline-none" />
          <button type="button" disabled={!approved || confirmText !== "PUBLISH" || busy !== null || !publishConfigured} onClick={publish} className={buttonClass("gradient", "w-full")}>
            {busy === "publish" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <CircleCheck className="size-4" aria-hidden />} Publish photo
          </button>
          {!publishConfigured && <p className="text-xs text-subtle">Not connected — download the approved image instead, or set GITHUB_TOKEN and GITHUB_REPO.</p>}
        </div>

        <button
          type="button"
          onClick={async () => {
            await fetch("/api/admin/login", { method: "DELETE" });
            router.replace("/admin/login");
          }}
          className={buttonClass("subtle")}
        >
          <LogOut className="size-4" aria-hidden /> Sign out
        </button>
      </aside>
    </div>
  );
}
