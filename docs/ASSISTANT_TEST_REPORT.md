# “Ask about Ankit” — test report

Date: 6 Nov 2026. Machine: Intel Core i7-8665U (4 cores / 8 threads), 16 GB RAM, Intel UHD Graphics 620 (driver 31.0.101.2135), Windows 11, Node 24.22.2. Production build (`next build` + `next start`) unless stated.

Rule followed: **a test is only listed as passed if it was executed and passed.** Anything not run is listed under *Not tested*.

## 1. Automated suites

| Suite | What it covers | Result |
|---|---|---|
| `tools/tests/assistant.test.ts` | Source hygiene (no control characters, embeddings in sync with content, workers pinned to library versions, no CSP-blocked worker patterns); guardrails (14 blocked, 7 allowed, limits); sentence splitting; KB punctuation; prompt signatures; validator (accepts faithful answers, tolerates 6 measured false-alarm forms, rejects invented numbers/quantities/employers/products/citations); full 38-question evaluation keyword-only and hybrid; model contract with a scripted fake model (one generation call, hallucination replaced, decline-with-evidence replaced, ignored caveat replaced, unknown topics and guardrail hits never reach the model, model failure degrades visibly, prompt contains only retrieved public evidence) | **27/27 passed** |
| Mutation check | Disabled the validator's replacement branch → the hallucination test failed as expected; source restored | **caught** |
| `tools/bench/retrieval.ts` | Retrieval/routing without any model, 38 questions | **Hybrid 38/38** (retrieval 32/32, routing 32/32, keyword coverage 88 %, ~18 ms/question); BM25-only 36/38 |
| `tests/admin-api.test.mjs` (server with throwaway test credentials) | Redirect when signed out, 401 without session, cross-origin login 403, wrong password 401 without cookie, HttpOnly + SameSite=Strict cookie, studio reachable when signed in, tampered cookie 401, cross-origin upload 403, SVG/garbage 422, oversize 413 before reading, publish without confirm 400, publish/enhance 501 when not connected (nothing committed or sent), sign-out clears cookie, rate limit 429 | **14/14 passed** |
| `tests/llm-proxy.test.mjs` (fake OpenAI-compatible upstream, no model, no network) | Status hides address and key; own prompt streamed with server-side key/model; generic chatbot prompt refused before upstream; injection and private questions refused server-side; malformed / extra-message / max_tokens 5000 / 40 KB / cross-origin rejected; rate limit 429 | **6/6 passed** |
| `tests/contact-api.test.mjs` | Existing contact-form API | **8/8 passed** on first run; immediate re-runs return 429 by design (5 requests / 10 min) |
| TypeScript (`tsc --noEmit`) and `next build` | Whole app | **pass** |

## 2. Browser tests (real browsers, production build)

In-app Chromium 152 and Microsoft Edge 156.

| Check | Result |
|---|---|
| Inline scripts all parse; no console errors on load | **pass** (after fixing the mode boot script, see §4) |
| Visitor modes: `?mode=recruiter` / `?mode=technical` set `<html data-mode>` before paint, sections re-order, switcher shows the mode, choice persists | **pass** |
| Floating panel opens, persona picker, suggestions, question → cited answer with sources, cards, actions and follow-ups; session history survives navigation to `/ask` | **pass** |
| Phone (375 px): no horizontal overflow; panel full screen; launcher made compact so it no longer covers hero buttons | **pass** |
| Embedding worker in the browser: loads under the CSP from jsDelivr + Hugging Face, 384-d unit vectors, cosine vs Node build-time vector **1.00000**, first load 9.6 s, then ~0.1 s per question; UI switches to “with semantic search” | **pass** |
| Heavy WebLLM bundle (6 MB) and model CDNs are **not** requested on a normal page load | **pass** |
| On-device model (Qwen2.5-0.5B q4f16 / q4f32) on Intel UHD 620 — Edge 156 visible window and in-app browser | Loads in 9–33 s; **generation never completes** (GPU device lost after ~77 s). Not a pass — see limitations. |
| Failure handling for that GPU: capability probe rejects the model 20 s after loading with a clear message and doesn't save it; if a model hangs mid-answer, the watchdog answers from verified evidence in 30.8 s with the notice “AI model didn't respond — showing the verified instant answer” and switches back to instant mode | **pass** |
| `/admin/login` without configuration shows “Admin features are disabled…”, `noindex, nofollow`; `/admin/photo` redirects | **pass** |
| Photo Studio with throwaway test credentials on a local server: wrong password message; sign-in; 64×64 PNG rejected with size message; SVG rejected; 800×800 JPEG loaded; zoom changes the exported crop; publish disabled until approved, case-sensitive `PUBLISH` gate; approval withdrawn when the crop changes; publish/enhance disabled with “not connected” notes; download of the approved image offered; sign-out returns to login | **pass** |
| Fresh InPrivate profile QA (`npm run qa`, 28 scenarios incl. assistant answers, guardrail, modes, phone, admin) | **Production: 28/28 clean** (no console errors, failed requests or overflow; answer, guardrail, mode and admin assertions all met). Before that, local build: 27/28 on the full run; the one failure was the test's own regex (an unescaped `\s` in the assertion) — the page was correct (screenshot 25). After fixing the assertion the scenario passes (re-run with `QA_ONLY=25`). Visual review of the screenshots then found duplicate action buttons and an ungrammatical placeholder; both fixed, scenarios 23 and 27 re-run clean. |
| Lighthouse | Production, desktop preset: `/` performance 98, accessibility 100, best practices 100, SEO 100 (LCP 0.9 s, CLS 0); `/projects/nexusai` performance 80 / 89 / 91 over three runs (TBT 220–350 ms from framework hydration — the machine's Lighthouse benchmark index varied 470–850, below the ~1000 Lighthouse assumes), accessibility 100, best practices 100, SEO 100; `/ask` performance 85, accessibility 98 (a heading-order issue — fixed and re-checked after the follow-up deploy), best practices 100, SEO 100. |
| Production deployment, fresh session | Preview deployment first (Vercel branch preview): `/ask?q=` answered, embedding worker 384-d on the real CDN path, CSP/HSTS headers present, `/admin/photo` redirects. Then production: all routes 200, and the fresh InPrivate QA above (**28/28 clean** against `https://ankit-chand-portfolio.vercel.app`). The only console messages on the *preview* were Vercel's own preview toolbar being blocked by the CSP, which production never loads. |

## 3. Model benchmark

Full tables: [benchmarks/README.md](benchmarks/README.md) (generated from the raw JSON).

- **Final run, final code, 35 questions:** Qwen2.5-0.5B — 35/35 correct, 97 % of its own drafts accepted, 3/3 unknowns declined; Llama-3.2-1B — 35/35, 85 %, 3/3. Every replaced draft is listed with the validator's reason.
- **Standardised CPU speed (llama-bench pp512/tg128, all five models):** decode 14.3 (Qwen2.5-0.5B) → 6.9 tok/s (Qwen3-1.7B). Large standard deviations show the laptop was throttling; treat as a ranking.
- **Preliminary run (older validator, busy machine):** Qwen2.5-1.5B 79 % and Gemma-3-1B 61 % drafts accepted. Qwen3-1.7B was speed-tested only.
- **Stopped early, by decision:** the final quality run for Qwen2.5-1.5B and Qwen3-1.7B (2–3 h each at this machine's speed). Not counted as passed.
- **Found after the final run:** one validator false alarm in Llama's results (`unsupported employer "Medical Research.   This"` — the employer pattern crossed a sentence boundary). Fixed with a regression test; the published Llama numbers were measured *before* the fix, so its acceptance rate is, if anything, understated by one answer.
- **Self-hosted tier with a real model:** see ASSISTANT.md §1 — `llm`-mode answer through the proxy, validated, 36 s; unauthenticated upstream requests refused (401).

## 4. Defects found by testing, root causes and fixes

| Symptom | Root cause | Fix (and regression guard) |
|---|---|---|
| `Uncaught SyntaxError: Function statements require a function name` on every page; modes never applied before paint | `MODE_BOOT_SCRIPT` was a string exported from a `"use client"` module; imported into the server layout it became a client-reference stub, whose source got inlined | Constants moved to `src/lib/modes.ts`; scanned all 30 client modules for similar imports (none) |
| Semantic search never worked in production | Turbopack copied `new Worker(new URL("./x.worker.ts", import.meta.url))` targets as raw `.ts` files, served as `video/mp2t` with `nosniff` | Workers are plain JS in `public/workers/`; test forbids the pattern and checks version pins |
| On-device model stuck at 0 % | A static `import … from "https://cdn…"` in a module worker is fetched with destination *worker* and blocked by CSP `worker-src 'self'` | Dynamic `import()` (checked against `script-src`) with message buffering; test forbids static CDN imports in workers |
| Hung GPU generation would leave the visitor waiting forever | Some GPU/driver combinations accept WebGPU work and never return | Load watchdog (90 s stall), capability probe, generation watchdog, auto-disable, visible notice |
| “Data Scientist at Retisio India Pvt.” — truncated answers; fragments like “pdf, updated Nov 2026).” | Naive sentence splitter (abbreviations, file names, numbered lists) | New splitter with abbreviation/enumerator rules + tests |
| “… Pvt. Ltd..”, “offline.; A fake LLM…” in answers | Templates joined source sentences that already ended with periods | `tidy()` on every chunk + test over all chunks |
| “working as a Pursuing PG Program” | A `\b` in a regex was turned into a backspace character by shell escaping | Fixed; test fails on any control character in sources |
| Many good model drafts thrown away | Validator false alarms (“2024.” with trailing period, “October” vs “Oct”, “Postgraduate”, “approximately 2” vs “about 2”, “four” vs “4”, title-cased verbs, project names after “for”) | Form-tolerant matching, still strict on facts; tests for both directions |
| Wrong answers kept | Model declined despite evidence; model ignored a missing-topic caveat (“video editing agent”) | Orchestrator policy replaces both with the verified answer; tests |
| Optional proxy usable as a free general chatbot | It forwarded any messages | Only `[system, user]` with this assistant's prompt signature; guardrails re-run server-side; tests |
| Photo upload read fully into memory before the size check; no origin check | Missing early checks | `Content-Length` and size check first, same-origin check; tests |
| Chat input focus scrolled the page past the hero in AI-conversation mode; no “clear” on `/ask` | Autofocus without `preventScroll`; clear only existed in the panel header | `focus({ preventScroll: true })`; *New conversation* button |
| Navbar labels wrapped onto two lines at 1440 px; “Let's connect” overflowed at 1024 px | The new mode switcher and Ask AI button exceeded the navbar's 1152 px cap | Ask AI button only where links are collapsed (md–lg), compact switcher below xl, brand text hidden at lg–xl, `whitespace-nowrap`; measured no wrap/overflow at 768–1920 px |
| Three identical “Explore NexusAI” buttons under an answer; placeholder “Ask as a explore…” | Actions de-duplicated by URL only (one per section anchor); naive placeholder template | De-duplicate by label too; persona-aware placeholder; test |
| On the Vercel preview, a question sent right after page load reloaded the page (`/ask?`) and was lost | Before hydration the chat form had no handler, so the browser performed a native GET submit | The form is now a real `GET /ask?q=…` form and `/ask` answers `?q=` on load (asked once, URL cleaned) — works before hydration and without JavaScript; shareable question links |
| Floating launcher covered hero buttons on phones and showed on admin pages | Full-width pill at all sizes; no route exclusion | Icon-only below `sm`; hidden on `/admin` |

## 5. Not tested

- On-device generation quality and speed on a GPU that can run WebLLM (no such GPU available).
- Tier C against an internet-facing server (verified locally with a real `llama-server` + API key, and with a fake upstream for the security cases).
- Photo publishing to GitHub and image enhancement against real services (deliberately not connected; only the refusal paths and the UI were tested).
- Safari and Firefox.
