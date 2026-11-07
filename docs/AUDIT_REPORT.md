# End-to-end audit, fixes and verification — November 2026

Scope: the whole portfolio (every page, control, API, the “Ask about Ankit” agents, security, performance, deployment), audited against all earlier requirements, then fixed, enhanced and re-verified. Every result below comes from an executed test; anything not executed is listed as **not run** with the reason. Raw evidence: `docs/benchmarks/agent-execution.json`, `docs/screenshots/qa-results.json`, the test files named in each row.

## A. Audit — what was found

How the audit was done: a read-only code inventory of every page and component (is each control wired to real behaviour?), a security/config review (secrets in the tree and the full git history, public files, API validation, headers, dependencies), browser exploration of the live site, and a **real-inference** run of every agent with an open-weight model.

| Area | Expected | Found before this pass | Status now |
|---|---|---|---|
| Home | Interactive landing page | Worked; some counts hard-coded (“1 in progress”, “PG Diploma … 2020”) | Counts computed from content; interactive hero network, toolkit strip, counting highlights, card spotlight/tilt, reading progress |
| About · Experience | Profile, career timeline | Worked; **invalid list markup** (`<div>` directly inside `<ol>`) in both timelines | Fixed (`Reveal as="li"`) |
| Skills | Technical skills | Worked; no visual summary | Added the “Where the evidence is” chart (each bar opens its evidence) |
| Projects | Searchable, filterable catalogue | Search ignored problem/approach/features/agents (placeholder promised “problem”); search reached the URL only on blur; back/forward didn't update the box; a filter clicked right after typing could drop the search (stale URL params) | All fixed; search covers every text field and is shareable |
| Project details | Architecture, stack, links | Worked; all GitHub links real (no `#`/TODO) | Unchanged; tilt/spotlight on cards |
| Certifications | Gallery | Worked; all five lack image/verify URL/date in the content; dialog showed “Completed: —” | Shows “Date not listed”; **content needed from the owner** (§F) |
| Education · Achievements | Details, milestones | Copy promised “open any milestone” although milestones don't open | Copy corrected |
| Knowledge Hub | Notes | 4 of 10 topic chips permanently disabled (no notes) | Only topics with notes are shown |
| Resume | Preview and download | Worked; printable page had no print button | Print / save-as-PDF button (hidden in print) |
| Contact | Working contact | **Production has no delivery channel**: visitors filled the whole form and only then learnt it could not be sent | Form says so up front and hands the validated message to the visitor's email app; real delivery needs one env var (§F) |
| Ask about Ankit | Conversational assistant | Worked; see agent findings below | Fixed (below) |
| Six interaction modes | Recruiter, Technical deep dive, Student, Project explorer, AI conversation, Professional overview | Site views existed, but **4 of 6 had no assistant persona** (fell back to generic ones), persona style was ignored without a model, and switching the view mid-conversation did nothing | Each mode is its own persona, synced both ways, and changes answers even without a model |
| AI agents | Real orchestration | Routing misrouted “Which projects use multi-agent orchestration?” (a suggested follow-up) to the recruiter; the 0.5B planner could override the router; NexusAI was crowded out of “multi-agent projects” evidence; preamble words became “unknown topics”; no client timeout on the self-hosted tier; the proxy timeout cut slow-but-healthy streams | All fixed with root causes and regression tests (§B) |
| Profile photo | Placeholder, upload, preview, **removal** | No way to remove the live photo / return to the placeholder; publishing never set `photo.src` | Revert-to-placeholder (typed REMOVE) and publish now points the profile at the photo |
| SEO | Metadata, sharing | Static pages inherited the home page's `og:title` and `og:url "/"` (Next.js replaces, not merges, `openGraph`); `/ask` missing from sitemap, footer and search; manifest had only an SVG icon | Per-page Open Graph/Twitter tags; `/ask` everywhere; PNG manifest icon |
| Security | No secrets, safe APIs | No secrets in tree or history; 0 npm vulnerabilities; CSP allowed **all of jsDelivr** (any npm package); a local Windows path in tooling; status endpoint probed the model server on every hit; contact body size checked after reading | CSP pinned to three package paths (tested); paths derived from the home directory; 30 s health cache; size checked before reading |
| Responsive | Mobile/tablet/desktop | No overflow found | Re-tested (§D) |
| Deployment | Public URL | Live and auto-deployed from `main` | Re-deployed and re-tested (§E) |

## B. Fixes — root cause → change → proof

| # | Defect (how found) | Root cause | Fix | Regression test (fails without the fix) |
|---|---|---|---|---|
| 1 | Modes didn't change the assistant (code audit) | `MODES` mapped four modes to generic personas; persona style only reached the model prompt | Four new personas (`overview`, `technical`, `projects`, `conversation`) with routing priors and an `answer` shape (points, evidence preference) applied in instant mode; mode ⇄ persona sync via a `portfolio:mode` event | `tools/tests/modes.test.ts` (mutation-checked) |
| 2 | Suggested follow-up “Which projects use multi-agent orchestration?” answered by the recruiter with a résumé card (agent run) | Embedding-only routing: bge-small scored all agents within 0.05 | Hybrid router (dense + 0.1 × BM25 over agent examples) and three new “which projects…” examples; routing 41/42 → 42/42 | `tools/tests/routing.test.ts` (mutation-checked) |
| 3 | 0.5B planner replaced a near-tie with wrong agents (agent run) | Planner output overrode the router entirely | Planner may only pick among agents within 0.03 of the best score | covered by the agent run (routing now always semantic for the owner's questions) |
| 4 | “What multi-agent projects…?” omitted NexusAI; the model then called a forecasting project multi-agent (agent run) | IntelliHub filled 3 of 5 evidence slots; NexusAI ranked 8th | Project agent is breadth-first (one chunk per project) when no project is named | `tools/tests/evidence.test.ts` (mutation-checked) |
| 5 | A hiring-manager preamble produced “no information about ‘manager’, ‘reviewing’…” (agent run) | Unknown-topic check and retrieval used the whole input | Only the asking sentence(s) drive retrieval, routing and the unknown-topic check; context still reaches the model | `tools/tests/evidence.test.ts` (mutation-checked) |
| 6 | First real question fell back after 45.6 s (agent run) | New watchdog too tight: CPU prefill of ~850 tokens takes ~47 s here | 90 s to first token, 20 s between tokens | `tools/tests/llm-http.test.ts` |
| 7 | A wedged self-hosted server kept visitors waiting; slow answers cut at 60 s (code review) | No client timeout; `AbortSignal.timeout` on the proxy fetch also aborts the streamed body | Client watchdog (plain Error → verified answer); proxy timeout covers headers only, visitor disconnect cancels upstream, 180 s cap | `tools/tests/llm-http.test.ts` (real local servers) |
| 8 | Contact form dead end in production (code audit) | Delivery is env-gated; the form only learnt that after submit | Server passes `delivery` to the form; up-front notice and email-app hand-off | browser QA scenario 32 |
| 9 | Photo couldn't be removed (code audit) | No API action; publish never set `photo.src` | `revert` action + studio UI with typed REMOVE; publish sets `src`; GitHub calls get timeouts and clear errors | `tools/tests/photo-publish.test.ts` (fake GitHub), `tests/admin-api.test.mjs` |
| 10 | Shared links previewed as the home page (code audit) | Next.js replaces parent `openGraph`; static pages set none | `pageMetadata()` helper on all 11 static pages | built HTML checked (§D) |
| 11 | Project search gaps (code audit) | Narrow search haystack; URL written on blur from stale params | Full haystack; debounced URL sync from `window.location`; back/forward sync | browser check |
| 12 | CSP allowed every jsDelivr package (security review) | Host-wide source | Three pinned package paths (incl. the onnxruntime-web build transformers.js loads) | `tools/tests/assistant.test.ts`; embedding worker verified in the browser under the new CSP (384-d unit vector) |
| 13 | “Open the certifications page” auto-opened **/resume** (probe while adding a Navigation-agent scenario) | The agent opened the page of the top evidence chunk; the word “page” matched the résumé chunk (“Resume page”) | The Navigation agent resolves the page the visitor names (or a named project) and opens only that one | `tools/tests/evidence.test.ts` (fails with the old behaviour: `→ /resume`) |
| 14 | Accurate Qwen3-1.7B draft rejected for “AutoGen-based” (benchmark; fixed in a separate session, merged here on your go-ahead) | The name check judged the hyphenated compound as a whole and “AutoGen-based” is not a known name | A known name followed by a short list of modifier suffixes (-based, -powered, -driven, …) is accepted exactly when the name is; Qwen3-1.7B re-measured at 33/33 drafts accepted | `tools/tests/assistant.test.ts` (accepts the real draft; still rejects “Task-Write-Execute”, “AutoGenX-based”, “AutoGen-Studio”, “Microsoft-certified”) |

## C. Agent execution report (real inference)

**Setup.** `tools/bench/agents.ts` starts llama.cpp `llama-server` (CPU, 4 threads) with **Qwen2.5-0.5B-Instruct Q4_K_M** — the site's default open-weight model — and sends 22 scenarios through the *same* orchestrator code the website runs, with the real bge-small embedding model. Every agent event is recorded; “generated” means tokens were actually streamed by the model (no mocks — the failure scenarios use a closed port and a real HTTP server that never answers). Hardware: Intel i7-8665U laptop, 16 GB RAM, no GPU. Full per-scenario table: [benchmarks/README.md](benchmarks/README.md) (section “Agent execution”) · raw JSON: [benchmarks/agent-execution.json](benchmarks/agent-execution.json).

**Final run (7 Nov 2026, after all fixes): 21/22 scenarios passed.**

| Agent | Model | Inference | Actual test (scenarios it led) | Result | Time (end-to-end, this CPU) | Known limitations |
|---|---|---|---|---|---|---|
| Conversation Orchestrator | — (deterministic) + Qwen2.5-0.5B planner | Ran on all 22 | Guardrails (injection, private data, over-long), question focus, follow-up resolution, hybrid routing, specialist selection, fallback | 22/22 routed or stopped correctly; routing was decided semantically in every case (planner not needed); in the first run the planner was used twice and once mis-picked agents → now limited to near-ties | < 0.1 s without a model | Planner on a 0.5B model is unreliable, hence tie-break only |
| Professional Profile Agent | Qwen2.5-0.5B | **Generated** (3/3) | background, certifications, multi-part (education + certifications) | 3/3 pass | avg 6.9 s, max 9.6 s | — |
| Technical Expertise Agent | Qwen2.5-0.5B | **Generated** (5/5) | strongest skills, Agentic AI, AutoGen, student mode, long question, missing info (honest decline, no model call) | 6/6 pass | avg 13.9 s, max 19.4 s | Long-question answer conflated ChromaDB (a listed skill) with the RAG project — passes the lexical validator |
| Project Intelligence Agent | Qwen2.5-0.5B | **Generated** (5/5) | multi-agent projects, RAG architecture, open-source models, GitHub projects, follow-up (“What is its architecture?” after NexusAI) | 4/5 pass — the RAG answer was accurate but omitted FAISS (the scenario requires it); it passed in the previous run | avg 11.6 s, max 13.2 s | “Multi-agent projects” answer names NexusAI and IntelliHub but also lists non-agent projects |
| Recruitment Assistant Agent | Qwen2.5-0.5B | **Generated** (1/1) | contact for an opportunity (recruiter mode) | 1/1 pass | 8.9 s | — |
| Portfolio Navigation Agent | Qwen2.5-0.5B | **Generated** (1/1) | “Take me to his resume page” (auto-opens `/resume`); unrelated question → honest decline with navigation | 2/2 pass | 9.4 s | Generated wording was clumsy; the action is deterministic |
| Response Validation Agent | deterministic | Checked all 15 model drafts | Numbers, quantities, employers, names, citations, decline/caveat policy | Final run: 0 replaced. Previous run (before the navigation fix only): replaced a draft that invented the year “2019”. First run: replaced drafts with an invented number (“10”) and an invented place (“Lahore”) | < 5 ms | Lexical: cannot catch category errors (see Project agent) |
| Failure handling | — | Closed port; server that never answers | Model unavailable → verified answer; model silent → watchdog → verified answer | 2/2 pass (0.0 s and 8.0 s with the test's 8 s limit; production limit 90 s) | — | — |

**How the run drove the fixes** (all measured, then regression-tested — §B): run 1 = 18/20 (wrong agents from the planner; a false “model unavailable” at 45.6 s; the long-question scenario was mis-specified) → run 2 = 20/21 → after the evidence and question-focus fixes 21/21 → with the new Navigation scenario 21/22 (the RAG keyword miss above) after the navigation fix.

**Public-inference reality.** These timings come from the optional self-hosted tier on this laptop. Public visitors get (a) instant verified answers on every device, with no model and $0, or (b) the same model in their own browser via WebGPU when their GPU supports it. On this laptop's Intel UHD 620 that path loads but cannot generate, and fails safely to (a) — see ASSISTANT.md §4. No paid API is used anywhere.

## D. QA test report

Each executed check is counted once, in one category. *Blocked* = could not be executed for a reason outside the code; *Not run* = deliberately not executed (reason given).

| Test category | Total tests | Passed | Failed | Blocked | Not run |
|---|---:|---:|---:|---:|---:|
| Navigation | 16 | 15 | 0 | 1 | 0 |
| UI/UX | 15 | 15 | 0 | 0 | 0 |
| Forms | 13 | 11 | 0 | 1 | 1 |
| Projects | 16 | 16 | 0 | 0 | 0 |
| AI assistant | 51 | 51 | 0 | 0 | 0 |
| Open-source agents | 27 | 25 | 1 | 1 | 0 |
| Security | 32 | 31 | 0 | 0 | 1 |
| Performance (Lighthouse runs) | 10 | 5 | 3 | 2 | 0 |
| Responsive testing | 11 | 9 | 0 | 0 | 2 |
| Deployment | 12 | 11 | 0 | 1 | 0 |

What is in each row (evidence):

- **Navigation**: browser QA scenarios 01, 03, 06, 09 (Ctrl K palette), 10, 12, 21 (404) on production; route checks on production (`/api/contact` GET → 405, `/api/assistant/status` 200 with no address/key, `/admin/photo` → 307 to sign-in, résumé PDF 200, `/kb/knowledge.json` 200, robots, manifest, PNG icon). *Blocked*: LinkedIn profile link returns 999 to automated requests (LinkedIn's bot block); the URL is correct but was not machine-verifiable.
- **UI/UX**: QA 02, 07, 08, 13 (light theme), 26, 30 (evidence chart), 31 (toolkit); browser checks of the hero network (renders, pointer joins it), card tilt (measured ±1.2°/1.5°) and spotlight, reading-progress bar (scaleX tracks scroll), marquee duplicate `aria-hidden` + unfocusable, count-up lands on the real values, chart bar opens the skill's evidence, phone static frame (0 animation frames/s at 375 px) vs desktop animation, hero readability on desktop and phone.
- **Forms**: contact API 8/8 (405/415/403/400 with field errors/413/honeypot/time-trap/503 when unconfigured); QA 11 and 32 (delivery notice in production); empty-form validation shows five field errors and focuses the first. *Not run*: clicking the email-app hand-off with valid data (it would launch the mail client on this machine). *Blocked*: real delivery (no Resend/webhook configured — §F).
- **Projects**: QA 04 (filtered URL), 05 (interactive NexusAI architecture); all 11 GitHub repository links return 200; production search: a word that only appears in a project's features (“luhn”) finds it, typing continues uninterrupted through the debounced URL update (`?q=luhn`), and a filter clicked after typing keeps `q`.
- **AI assistant**: QA 22, 23 (cited answer), 24 (guardrail), 29 (picking the Projects mode switches the site view), 33 (long question with preamble); browser: picking Technical in the assistant switched the site view, and switching the view mid-conversation switched the assistant's persona; `tools` suites assistant 27 + modes 4 + routing 2 + evidence 5; model proxy 6/6 against a fake upstream.
- **Open-source agents**: 22 real-inference scenarios (§C; the failure is the RAG answer omitting FAISS) + 4 watchdog tests against real local servers. *Blocked*: on-device (WebGPU) generation — this laptop's GPU loads the model but cannot generate (fails safely).
- **Security**: admin API 15/15 (incl. revert), photo publishing 5/5 against a fake GitHub API, secrets scan of the tree and the full history, `npm audit` root + tools (0 vulnerabilities), live security headers, source maps not served, `/.env` `/package.json` `/build.log` → 404, embedding worker loads under the narrowed CSP (384-d unit vector), WebLLM runtime imports under it, revert button stays disabled when publishing is not connected (the CSP-pinning test is counted under AI assistant, in the tools suite). *Not run*: a real GitHub commit from the studio (it would change the production repository; covered by the fake-API tests).
- **Performance**: Lighthouse on production, desktop preset — `/` 98 and 95, `/skills` 99, `/ask` 98, `/projects/nexusai` 98 (LCP 0.6–0.9 s, CLS ≤ 0.016). Mobile preset — `/` 65 and 67, `/projects` 69 (LCP 3.2–3.4 s, TBT 1.1–1.5 s). Mobile counts as *failed* here against a 90 target; `/projects`, which has none of the new effects, scores the same, so the cost is React hydration under 4× CPU throttling on a machine whose Lighthouse benchmark index was 560–920 (Lighthouse calibrates for ~1000+); there is no earlier mobile baseline to compare against. Accessibility, best practices and SEO were **100 in every completed run**. *Blocked*: 2 runs ended with Lighthouse's `NO_NAVSTART` trace error (re-run).
- **Responsive**: QA 14, 15 (tablet), 16, 17 (menu), 18, 19, 20, 27, 34 (phone); every one of the 34 scenarios also asserts no horizontal overflow. *Not run*: Safari and Firefox (not installed here).
- **Deployment**: three production builds succeeded on Vercel (`fe85868`, `428b731`, `a720e22`); production serves server-rendered markers of the new build (toolkit strip, `/ask` in the sitemap, per-page `og:title`, pinned CSP header), the new CSS and the new hero script; full fresh-profile QA on production **34/34 clean**; hero scenarios (01, 02, 13, 16) re-run clean on production after the readability change, and 01, 16, 27, 34 after the final phone change (`a720e22`). *Blocked*: the Vercel preview check — previews sit behind Vercel's login and the browser session had expired (signing in is the owner's to do); the same commits were verified on a local production build instead (API suites and 34 scenarios) and then on production.

## E. Deployment

| Item | Value |
|---|---|
| GitHub repository | https://github.com/chandankit/ankit-chand-portfolio (public) |
| Live portfolio | **https://ankit-chand-portfolio.vercel.app** |
| Platform | Vercel (Hobby, free), Git-connected: every push to `main` builds and deploys; branches get login-protected previews |
| Status | Deployed; last production commit `a720e22` (all builds green) |
| Branch | Work on `feature/audit-polish`, fast-forwarded into `main` |
| Commit author | `ankitchand <83659676+chandankit@users.noreply.github.com>` for the new commits |
| Public, logged-out test | Fresh InPrivate Edge profile (no cookies, not signed in to GitHub or LinkedIn): 34/34 scenarios clean across desktop, tablet and phone, incl. assistant answers, guardrails, modes, contact, skills chart, admin disabled; no console errors, failed requests or horizontal overflow |
| Hosting limits | Static pages from the CDN; API routes are serverless functions (contact, model proxy, admin) with in-memory rate limits per instance. The free plan needs no runtime AI: answers are computed in the visitor's browser. Optional self-hosted inference is supported but not configured. |
| Paid services | None. No paid API, subscription or usage-billed AI service anywhere in the runtime. |

## F. Remaining issues (need the owner or are out of reach)

| Item | Why it isn't done | What is needed |
|---|---|---|
| **Contact email delivery** | Needs an account with a delivery service; creating accounts or entering keys on your behalf isn't allowed, and you chose earlier to keep it off. The form now works honestly without it (email-app hand-off). | Optional: set `RESEND_API_KEY` + `CONTACT_TO_EMAIL` (Resend's free tier does not auto-bill) or a `CONTACT_WEBHOOK_URL` in Vercel, then redeploy. |
| **Photo Studio** | Disabled until configured (by design). Publish/revert need a GitHub token. | `ADMIN_PASSWORD` + 32-character `ADMIN_SESSION_SECRET`; optionally `GITHUB_TOKEN` (fine-grained, this repo, Contents write) + `GITHUB_REPO`. |
| **Certificate evidence** | All five certifications have no image, date or verification link in `content/certifications.json`; inventing them is not allowed. | Add the certificate files to `public/certificates/` and their dates/verify URLs. |
| **UAC forecasting claim** | The résumé says the 4-week error was “halved”; the project's public README reports MAE **43 %** below a naive forecast. Both are your words, so neither was changed. | Decide which wording to keep (the case study, timeline and assistant all quote “halved”). |
| **Public AI generation for every visitor** | Zero paid APIs means generation runs in the visitor's browser (WebGPU) or on a server you host. Instant verified answers work for everyone; generation needs a capable GPU (it fails safely on this laptop's Intel UHD 620). No free, non-expiring hosted GPU exists that fits the constraints. | Optional: run llama.cpp on a machine you control and set `INFERENCE_BASE_URL` (proxy, guardrails, timeouts and rate limit already in place). Never expose it without the proxy. |
| **Mobile performance 65–69** | Desktop is 95–99, but on Lighthouse's throttled mobile profile React hydration dominates (pages without the new effects score the same). Cutting it means moving more of the home page to server components and loading the animation library only where it is used — a refactor, not a fix. | Optional follow-up; measure on a faster machine first (this laptop's benchmark index was 560–920). |
| **Rate limits are per serverless instance** | A shared store (Upstash/Vercel KV) would be a new service. | Only matters once contact delivery or admin is switched on; Vercel firewall rules are the free alternative. |
| **Not tested** | Safari and Firefox (no install here); real email delivery and real GitHub publishing (not configured — tested against a fake GitHub API only); on-device generation speed (GPU hangs here); a full LinkedIn cross-check (not needed: no content was added). | — |
| **Commit author** | New commits use `ankitchand` with the GitHub *noreply* address you chose earlier — verified and attributed to your account, and it keeps the address out of git metadata that mirrors and scrapers copy. Earlier commits were not rewritten — rewriting published history on `main` is destructive. | Say if you want the Gmail address on future commits instead. |
