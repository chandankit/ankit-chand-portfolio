"use client";

import { useEffect, useRef } from "react";

/**
 * Hero background: a quiet "agent network". Nodes drift and link to near neighbours;
 * when the visitor moves the pointer over the hero it joins the network — nearby nodes
 * brighten and connect to it.
 *
 * Built to cost nothing the visitor would notice:
 *  • starts only once the browser is idle, so it never competes with first paint (LCP);
 *  • pauses while scrolled out of view or while the tab is hidden;
 *  • prefers-reduced-motion, phones and touch screens → a single static frame, no loop;
 *  • 24–70 nodes scaled to the area, device-pixel ratio capped at 2;
 *  • aria-hidden and pointer-events: none — it never blocks clicks, focus or reading.
 */
export function NeuralField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    type Node = { x: number; y: number; vx: number; vy: number; c: number; r: number };
    const LINK = 132;
    const POINTER = 170;
    // Reduced motion, and also single-column / touch layouts: there the network is only a
    // faint band above the text and there is no pointer to follow, so a static frame is
    // enough — no animation loop eating a phone's CPU and battery (measured on Lighthouse
    // mobile: rendering and style work dominate the throttled main thread).
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce), (max-width: 1023px), (pointer: coarse)");
    let nodes: Node[] = [];
    let colors: string[] = [];
    let w = 0;
    let h = 0;
    let raf = 0;
    let running = false;
    let inView = true;
    const pointer = { x: -1e4, y: -1e4 };

    const readColors = () => {
      const cs = getComputedStyle(document.documentElement);
      colors = ["--teal", "--indigo", "--amber", "--sky"].map((v) => cs.getPropertyValue(v).trim() || "#818cf8");
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(70, Math.max(24, (w * h) / 15000)));
      while (nodes.length < count) {
        nodes.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28, c: nodes.length % 4, r: 1 + Math.random() * 1.6 });
      }
      nodes.length = count;
      for (const n of nodes) {
        n.x = Math.min(n.x, w);
        n.y = Math.min(n.y, h);
      }
    };

    const draw = (step: boolean) => {
      ctx.clearRect(0, 0, w, h);
      if (step) {
        for (const n of nodes) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 0 || n.x > w) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
        }
      }
      ctx.lineWidth = 0.8;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > LINK * LINK) continue;
          const mx = (a.x + b.x) / 2 - pointer.x;
          const my = (a.y + b.y) / 2 - pointer.y;
          const near = mx * mx + my * my < POINTER * POINTER;
          ctx.globalAlpha = (1 - Math.sqrt(d2) / LINK) * (near ? 0.65 : 0.3);
          ctx.strokeStyle = colors[a.c];
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      for (const n of nodes) {
        const dx = n.x - pointer.x;
        const dy = n.y - pointer.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < POINTER) {
          ctx.globalAlpha = (1 - d / POINTER) * 0.5;
          ctx.strokeStyle = colors[n.c];
          ctx.beginPath();
          ctx.moveTo(pointer.x, pointer.y);
          ctx.lineTo(n.x, n.y);
          ctx.stroke();
        }
        ctx.globalAlpha = d < POINTER ? 1 : 0.7;
        ctx.fillStyle = colors[n.c];
        ctx.beginPath();
        ctx.arc(n.x, n.y, d < POINTER ? n.r + 1 : n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const loop = () => {
      draw(true);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running || reduce.matches || !inView || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const sync = () => {
      stop();
      draw(false);
      start();
    };

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      if (!running) draw(false);
    };
    const onLeave = () => {
      pointer.x = pointer.y = -1e4;
    };
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) start();
      else stop();
    });
    const ro = new ResizeObserver(() => {
      resize();
      if (!running) draw(false);
    });
    // Theme switches change the palette (the theme selector sets data-theme on <html>).
    const mo = new MutationObserver(() => {
      readColors();
      if (!running) draw(false);
    });
    const onVisibility = () => (document.hidden ? stop() : start());

    let cancelled = false;
    const init = () => {
      if (cancelled) return;
      readColors();
      resize();
      draw(false);
      canvas.dataset.ready = "true";
      io.observe(canvas);
      ro.observe(canvas);
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
      window.addEventListener("pointermove", onPointer, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
      document.addEventListener("visibilitychange", onVisibility);
      reduce.addEventListener("change", sync);
      start();
    };
    // Safari has no requestIdleCallback.
    const hasIdle = "requestIdleCallback" in window;
    const handle = hasIdle ? window.requestIdleCallback(init, { timeout: 2000 }) : window.setTimeout(init, 800);

    return () => {
      cancelled = true;
      if (hasIdle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
      stop();
      io.disconnect();
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("pointermove", onPointer);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      reduce.removeEventListener("change", sync);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={`neural-field pointer-events-none ${className ?? ""}`} />;
}
