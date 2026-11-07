# Themes, Agents directory, AI Lab and topic map — feature report (November 2026)

Brief: make the portfolio a dynamic AI-professional workspace, using Poornima Mohankumar's portfolio (poornima-mohankumar.vercel.app, provided as 17 screenshots) as the reference for a theme selector and an agents directory, research other AI/ML portfolios, find what was still missing, build the valuable parts, and test and deploy them. Rule kept throughout: **nothing invented** — every agent, number and link traces back to the existing content, code or a recorded run.

## 1. What Poornima's portfolio does (reference)

Inspected from the screenshots and the live site's HTML/CSS/JS (read only):

- **Themes:** a palette button opens a popover with eight themes (Auto, Midnight, Aurora, Terminal, Ember, Ivory, Sakura, Ocean). Each is one `[data-theme]` block of CSS variables, including the heading font. An inline script in `<head>` prevents a flash on load, and the choice is stored in `localStorage`. Hovering an option previews it, and the reveal is a circular View Transition from the click point. The browser `theme-color` follows the theme, and canvases re-read the variables. Themes can also be switched from the ⌘K palette and from a terminal.
- **Agents ("Agents I've built"):** 14 agents, filtered by "In products" or "Personal & learning". Each row expands into three tabs (Overview, How it works, My work) with a deep link to `/agents/<slug>`. Rows show an evidence line ("19 of 20 commits") and a verified/pending flag. A "patterns" explainer and a scripted, no-AI "live simulation" sit alongside.
- **Elsewhere:** a 2D network / 3D globe hero whose nodes jump to the proof, a stats strip, two marquees, a skills section with "no percentage bars", an experience timeline with a sticky year, a projects table/accordion, a leadership reel, awards, a contact terminal, a ⌘K palette and a client-side "Ask about" assistant.

The brief listed example "product agents" (Content Analysis, Document Analyzer, Ideation, Localization, Banner and Video agents). These match **Poornima's** Indegene products, not Ankit's work, so none were added.

## 2. External research (useful ideas)

About 20 public portfolios and repositories were reviewed, including eugeneyan.com, simonwillison.net, hamel.dev, karpathy.ai, al-folio, leerob.io, slashpages.net and Transformer Explainer. The ideas worth building for this profile were:

- a retrieval inspector — built (AI Lab);
- eval error-analysis drill-down — built (AI Lab);
- model/system cards — partly covered by the agent pages;
- `/uses` and colophon, `/now`, a changelog and feed, and a build-time GitHub activity widget — not built, see §14.

Rejected:

- **Would need invented data:** self-rated skill bars, testimonials, visitor counts, padded talks/experiments.
- **Would add a paid or hosted runtime:** LLM-API playgrounds, hosted tracing.

## 3. Existing feature inventory (before this pass)

This pass started from the previous audit's inventory (`docs/AUDIT_REPORT.md` §A) and found these gaps:

- **Themes:** only a light/dark toggle, with dark forced and no Auto.
- **Agents:** described only inside the NexusAI and IntelliHub case studies, and the site's own live agents only on `/ask`.
- **Model benchmarks:** existed only in the repository docs, with nothing on the site.
- **Knowledge hub:** 3 notes, and 4 of its 10 topics had no content.

## 4. Missing and previously overlooked

| Gap | Importance | Effort | Done? |
|---|---|---|---|
| Theme system (Auto + named themes, no flash, persistence) | High (explicit request) | M | Yes |
| Agents directory with honest status | High (explicit request) | L | Yes |
| Agent detail pages and deep links | High | M | Yes |
| Live demonstration of the agents | High | S (link to the real assistant) | Yes ("Try it live") |
| Retrieval inspector (real, in browser) | High (research #1) | M | Yes |
| Model comparison and error analysis on the site | High (research #3) | M | Yes |
| Topic map for the requested knowledge areas | Medium | M | Yes |
| Toast notifications | Low | S | Yes |
| `/uses`, `/now`, changelog, GitHub activity | Low–medium | S–M | No (§14) |
| SHAP/LIME and forecasting dashboards | Medium | L | No: no SHAP artefacts exist yet, and forecasting results live in the UAC repository README |

## 5. New features implemented

| Feature | Where | What it does |
|---|---|---|
| Theme system | Palette button in the header, Ctrl K → “theme” | 7 options: Auto (follows the device), Dark, Light, Midnight, Aurora, Cyber Neon and High contrast. Hover or focus previews a theme, a click reveals it as a circle from the cursor (View Transitions), the choice persists, the browser UI colour follows, and a toast announces it |
| Agents directory | `/agents` (new nav item) | 29 agents in 6 systems; filters for category (Product / Personal / Learning & experimental), type (Research, Automation, Orchestration, Retrieval, Validation, Career, Domain, Documents), framework, model, project and status, plus search. Filters are kept in the URL |
| Agent detail pages | `/agents/<slug>` (29 static pages) | Overview (problem, where used, input, output, model, framework), how it works (pipeline steps, tools, memory, guardrails), works with (team), the system's interactive architecture diagram, status and evidence, and previous/next |
| Try it live | Live agents' cards and pages | Opens the real assistant with a question that, as a test confirms, reaches that agent |
| Agent patterns | `/agents` | 7 engineering patterns that recur across the systems, each linked to where it is used |
| AI Lab: retrieval inspector | `/lab` | Runs the site's real BM25 + bge-small hybrid search and router on the visitor's own query in the browser. Shows chunk scores (BM25, cosine, fused), the keyword-only rank and per-agent router scores |
| AI Lab: model comparison | `/lab` | Measured results for 4 open-weight models on the same 35 questions: own answers kept, keyword coverage, decode speed, licence, size. A drill-down shows every replaced answer and the validator's reason |
| Topic map | `/knowledge` | The 13 requested areas, each with a plain explanation, links to Ankit's evidence and official learning resources. Fine-tuning honestly shows “not part of my project work yet” |
| Toasts | Site-wide | Polite announcements (theme changes, copies) |
| Home and search | Home grid, Ctrl K, sitemap | Agents, AI Lab, Ask and Contact cards; Agents and Themes groups in Ctrl K; all new pages in the sitemap |

## 6. Themes

| Theme | Scheme | Character | Distinct design tokens |
|---|---|---|---|
| Auto | follows the device | Resolves to Dark or Light live | — |
| Dark | dark | Signature deep navy, teal and amber | The original design (returning visitors keep it) |
| Light | light | Warm paper, crisp ink | — |
| Midnight | dark | Near-black, electric blue and violet glow | Deeper shadows, blue/violet ambient orbs |
| Aurora | dark | Deep teal night, northern-lights gradients | Softer 1.5 rem corners, green/magenta/cyan ambient light |
| Cyber Neon | dark | Terminal display type, neon signals | JetBrains Mono headings, 0.5 rem corners, neon glow shadows |
| High contrast | dark | Black, white and yellow | No ambient colour, thicker focus rings, strong borders |

How it works:
- **Tokens:** every theme is one `[data-theme]` block defining the full set of 26 tokens (colours, gradients, ambient light, shadow, radius, display font and chart hue). Cards, charts, diagrams, buttons, dialogs and the hero canvas read only tokens, so they all adapt.
- **Registry:** themes are listed in `src/lib/themes.ts`.
- **No flash:** next-themes writes `data-theme` before first paint. Tailwind's `dark:` variant covers every dark-scheme theme.
- **Tested:** every theme has a complete token block, and the fg, muted and subtle text tokens plus the accents pass **WCAG AA (≥ 4.5:1)** on both surfaces in all 6 themes (`tools/tests/themes.test.ts`).
- **Chart hues:** checked against each theme's surface with the dataviz palette validator. High contrast deliberately keeps a brighter yellow.

## 7. Agent categories and agents

Status meanings (shown on the page): **Live** = running on this site; **Complete · tested** = built end to end with an offline test suite, private code; **Prototype** = earlier 2024–25 build from the specialization period, private code. Nothing is "planned".

| Category | System | Agents | Status | Model / framework | Source of truth |
|---|---|---|---|---|---|
| Product | Ask about Ankit (this site) | Conversation Orchestrator, Professional Profile, Technical Expertise, Project Intelligence, Recruitment Assistant, Portfolio Navigation, Response Validation (7) | Live | bge-small + optional Qwen2.5-0.5B; custom TypeScript | `src/lib/assistant/agents.ts` (names checked by a test) |
| Personal | NexusAI | MasterOrchestrator + Weather, News, Knowledge, Travel, Finance, Career, Research, Productivity (9) | Complete · tested (214 offline tests) | GPT-4o (Azure OpenAI); custom Python asyncio | `content/projects.json` (names and tools imported, checked by a test) |
| Personal | IntelliHub | Intent classifier & planner + AI Intelligence, India Market, US Market, Global News, Gov Jobs, Private & World Jobs, World Market, Health (9) | Complete · tested (357 offline tests) | GPT-4o; Microsoft AutoGen | `content/projects.json` |
| Learning & experimental | AutoGen code-generation team | Code Writer, Code Executor (2) | Prototype | GPT-4o; AutoGen | case study and experience entry |
| Learning & experimental | Teachable metadata extractor | Teachable Metadata Agent (1) | Prototype | Azure OpenAI; AutoGen, Flask, SQLite | case study |
| Learning & experimental | Medical-research Q&A | Research Q&A Assistant (1), labelled as a RAG assistant, not an autonomous agent | Prototype | GPT-4 + OpenAI embeddings; LangChain, FAISS | case study |

The personal examples in the brief (research, career, travel, finance, productivity, job research, knowledge) turned out to exist already as **NexusAI and IntelliHub specialists**, so they appear with their real tools. "Document intelligence" corresponds to IntelliHub's Health pipeline and the teachable extractor.

## 8–10. UI/UX, architecture and files

**UI/UX:**
- Theme menu with swatches, preview and keyboard support (↑/↓/Home/End/Esc).
- Agent cards with spotlight hover and stretched links, status dots and type chips.
- Detail pages with sticky side navigation on desktop and scrollable chips on phones.
- Lab tables with bar cells; topic cards.
- Toasts, loading and empty states (the agent filters, the inspector's first load, the error path).

**Architecture (data-driven, nothing hard-coded in big components):**
- `content/agents.json`: systems, statuses, categories, patterns. Specialists of projects are *imported* from `content/projects.json`.
- `src/lib/agents-directory.ts`: a pure zod-validated builder. Unknown project, missing tags, duplicate slug or unknown collaborator fails the build.
- `content/topics.json`: the topic map.
- `content/benchmarks.json`: generated **only** by `tools/bench/export-site.ts` from the recorded runs, so the site cannot show an unmeasured number.
- `src/lib/themes.ts`: the theme registry, with tokens in `globals.css`.
- `src/lib/assistant/browser/runtime.ts`: new `inspect()`, which uses the same retriever and router as the assistant.
- `src/lib/assistant-architecture.ts`: shared by `/ask` and the agent pages.

**Files.**
- New: `src/app/agents/page.tsx`, `src/app/agents/[slug]/page.tsx`, `src/app/lab/page.tsx`, `src/components/agent-explorer.tsx`, `retrieval-inspector.tsx`, `theme-switcher.tsx`, `toaster.tsx`, `src/lib/agents.ts`, `agents-directory.ts`, `agent-labels.ts`, `themes.ts`, `assistant-architecture.ts`, `content/agents.json`, `topics.json`, `benchmarks.json`, `tools/bench/export-site.ts`, `tools/tests/agents.test.ts`, `themes.test.ts`, `topics.test.ts`.
- Changed: `globals.css` (token sets, variant, reveal), `providers.tsx`, `layout.tsx`, `navbar.tsx`, `neural-field.tsx`, `palette-panel.tsx`, `search-index.ts`, `site.ts`, `sitemap.ts`, `page.tsx` (home), `knowledge/page.tsx`, `ask/page.tsx`, `copy-button.tsx`, `runtime.ts`, `scripts/qa-browser.mjs`.
- Removed: `theme-toggle.tsx`.

## 11–13. Testing, performance and accessibility

**Feature status**

| Feature | Existing/New | Implementation status | Test result | Performance (Lighthouse desktop, production) |
|---|---|---|---|---|
| Dynamic themes | New (replaces light/dark toggle) | Done: 7 options, preview, reveal, persistence, Ctrl K | Token completeness and WCAG AA contrast in all 6 themes (3 tests); 6 browser scenarios load a stored theme on 4 pages and 3 devices (`qa-theme=<id>` asserted before paint) | Home 90 (TBT 220 ms on a slow run; earlier 95–98) |
| Agents directory | New | Done: 29 agents, 6 systems | 6 integrity/honesty tests; QA 35 (list), 37 (filters: “Showing 7 of 29”) | `/agents` 98 · CLS 0.063 |
| Product Agents | New | 7 live agents (this site) | Live names match the assistant code; each “Try it” question reaches its agent through the real pipeline | — |
| Personal Agents | New | 18 (NexusAI and IntelliHub) | Names and tools match projects.json | — |
| Learning Agents | New | 4 (2024–25 prototypes) | Status/period checks; clearly labelled Prototype | — |
| Agent detail pages | New | Done: 29 static pages | QA 36 (tools, team, evidence), 44 (phone, light theme) | `/agents/nexusai-research` 98 |
| Project Explorer | Existing | Unchanged this pass (fixed in the previous audit) | QA 03, 04, 19 | — |
| Knowledge Hub | Existing + topic map | Done: 13 topics | 2 link-integrity tests; QA 39 (fine-tuning gap shown) | `/knowledge` 97 |
| AI/ML showcase | New (AI Lab) | Model comparison with drill-down from recorded runs | Data produced only by the export script; QA 42 (Neon theme) | `/lab` 98 |
| GenAI showcase | New (AI Lab) | Live retrieval inspector | QA 38: real in-browser bge-small inference on a fresh profile (“Semantic search on (bge-small)”, FAISS skill ranked #1); dev check: 310 ms embedding, 8 ms search + routing | `/lab` 98 |
| Responsive UI | Existing | New pages built mobile-first | QA 34, 44, 45 (phone/tablet); navbar stays on one row at 1024 and 1280 px; no horizontal overflow in any of the 45 scenarios | Mobile `/agents` 67 (see below) |

**Automated tests** (all executed):
- `tools`: **62/62**. New: themes 3, agents 6, topics 2, plus the previous assistant, routing, evidence, modes, timeouts, photo and metric suites.
- Typecheck clean; content validation (14 files) clean; production build 92 pages.

**Browser QA, fresh InPrivate Edge profile, `npm run qa` (45 scenarios):**
- local production build **45/45**;
- **production 45/45**: no console errors, failed requests or horizontal overflow, and every content assertion met.

**Manual browser checks (dev):**
- Theme menu: hover preview doesn't save; a click saves, changes the tokens (Aurora radius 24 px) and announces “Theme: Aurora”; the choice survives a reload.
- Agents filters: Research → 13, plus AutoGen → 7, with the filters kept in the URL.
- Agent detail: sections, tools, a team of 8, the architecture diagram.
- Lab: a real retrieval run.

**Performance (Lighthouse 12, production):**

| Page | Desktop | Mobile |
|---|---|---|
| `/agents` | 98 | 67 |
| `/agents/nexusai-research` | 98 | — |
| `/lab` | 98 | — |
| `/knowledge` | 97 | — |
| `/` | 90 | — |

- Mobile matches the site's other pages (65–69): React hydration under 4× CPU throttling on a laptop whose Lighthouse benchmark index was 559–761, where Lighthouse calibrates for about 1000+.
- The embedding model (~34 MB) loads only when a visitor runs the inspector or the assistant needs it, never on page load.

**Accessibility:**
- Lighthouse accessibility **100** on every page tested.
- Every theme passes WCAG AA text contrast (tested).
- The theme menu is a keyboard menu (menuitemradio, arrow keys, Esc returns focus).
- Filters are real buttons and selects with labels; status is never shown by colour alone (dot + text).
- Toasts use a polite live region; reduced motion disables the reveal and preview animation.

## 14. Remaining limitations

- **Example "product agents" from the brief were not added.** Content Analysis, Document Analyzer, Ideation, Localization, Banner and Video agents are Poornima's Indegene products. Nothing in Ankit's materials substantiates them, and the assistant already declines "video editing agent" questions for the same reason.
- **Learning agents are limited to what is documented.** The completed AutoGen and Agent Skills courses appear as certifications and as links in the topic map, but individual course-exercise agents are not described anywhere, so none are listed. Adding them needs a short description from the owner.
- **Not built:**
  - *SHAP/LIME explainability and forecasting dashboards:* there are no SHAP artefacts or exported forecast series in the content, and showing them would mean computing new results.
  - */uses, /now, a changelog and a GitHub activity widget:* lower value; possible follow-ups.
  - *A Poornima-style 3D globe hero:* the existing interactive network already serves that role, and a WebGL scene would cost performance.
- **Contact delivery still needs a delivery account**, as before: the form validates the message and hands it to the visitor's email app.
- **Themes are not yet applied to the static social-preview images** (Open Graph images are generated in one dark style).
- **Dev-server artefact:** running `next dev` from the parent folder makes `getArticles()` read the wrong folder (it uses `process.cwd()`), so the dev knowledge base lacks article chunks. Production is unaffected (209 chunks served); start the server from the project folder.

## 15. Repository and deployment

- **Repository:** https://github.com/chandankit/ankit-chand-portfolio, on branch `feature/themes-agents`, fast-forwarded into `main` as commit `ce8b0d7`. The commit author is `ankitchand`.
- **Live site:** **https://ankit-chand-portfolio.vercel.app**, on Vercel (free plan). The build is green.
- **New pages:** /agents, /agents/<slug> (29 pages), /lab, and the topic map on /knowledge.
- **Verification:** all 45 browser scenarios pass on production in a fresh private browser that isn't signed in to anything. Lighthouse results are in the table above.
- **Running cost:** no paid service of any kind.
