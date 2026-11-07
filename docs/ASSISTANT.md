# “Ask about Ankit” — architecture, models and operations

A multi-agent assistant that answers questions about Ankit Chand's portfolio, built
**entirely on open-source software and open-weight models, with no paid API at any
point** — not for answering, embedding, routing or validating. Claude Code was used
to *develop* it; nothing at runtime depends on Claude or any other commercial model.

- Live: `/ask` (full page; `/ask?q=…` asks a question directly), the **Ask about Ankit** launcher on every page, and the *AI conversation* view.
- Code: `src/lib/assistant/` (pipeline, framework-free TypeScript), `src/components/assistant/` (UI),
  `public/workers/` (browser workers), `tools/` (offline embedding build, tests, benchmarks).

## 1. Why this architecture (RCA of the constraints)

| Constraint | Consequence |
|---|---|
| Zero paid inference, no pay-per-token or subscription API | Only open-weight models; compute must come from somewhere free. |
| Hosting is Vercel (serverless functions: ~1–2 GB RAM, short time limits, no GPU) | A language model **cannot** run on the site's server. |
| Don't expose a personal laptop to the internet | The developer machine can't be the public model server. |
| Answers must be truthful and cite sources; never fail silently | The model can't be trusted alone — retrieval + a deterministic validator decide what is shown, and every failure degrades to a verified answer with a visible notice. |
| Smallest reliable model, minimal inference calls | ≤ 1 generation per question (+1 small planning call only for ambiguous routing); 0 calls for guardrail hits and unknown topics. |

So the assistant has **three tiers that share one pipeline**:

| Tier | Where it runs | Cost | Availability |
|---|---|---|---|
| **A · Instant answers** (default) | Visitor's browser: hybrid retrieval + verified extractive composition | $0 | Every device, no download beyond ~35 KB (gzip) of knowledge base |
| **B · On-device AI** (opt-in) | Visitor's GPU via WebLLM/WebGPU, open-weight model (default Qwen2.5-0.5B-Instruct) | $0 (visitor's hardware) | Browsers with WebGPU and a GPU that can run the model; one-time ~290 MB download, cached |
| **C · Self-hosted AI** (optional) | Your own OpenAI-compatible server (llama.cpp `llama-server`, Ollama, vLLM, TGI) behind the site's hardened proxy | Your hardware / free compute | Only when `INFERENCE_BASE_URL` is set |

If tier B or C is unavailable, slow, hung or wrong, the visitor still gets a tier-A answer — and is told so.

Tier C was verified end to end on this machine with a real model: `llama-server` (Qwen2.5-0.5B, `--api-key`) behind the site's proxy answered *“Does he have experience with RAG?”* in `llm` mode, validated with no issues, in 36 s on the laptop CPU; the upstream refused unauthenticated requests (401) and `/api/assistant/status` reported only the label.

## 2. Pipeline

```mermaid
flowchart TD
  Q[Visitor question + persona] --> G{Guardrails<br/>deterministic}
  G -- injection / private / abuse / too long --> R1[Polite refusal · no model call]
  G -- ok --> QF[Question focus<br/>the asking sentence(s) drive retrieval;<br/>context sentences only reach the model]
  QF --> F[Follow-up resolution<br/>entities from previous turn]
  F --> E[Query embedding<br/>bge-small-en-v1.5 in a Web Worker<br/>precomputed for suggested questions]
  E --> H[Hybrid retrieval<br/>BM25 + dense cosine, convex fusion]
  H --> U{Unknown-topic check}
  U -- named thing not in portfolio --> R2[Honest decline + closest facts · no model call]
  U -- ok --> RT[Hybrid router<br/>example similarity: dense + BM25<br/>+ evidence type vote + persona prior]
  RT -- near-tie AND model available --> P[LLM planner<br/>JSON schema, 80 tokens<br/>may only pick among near-tied agents]
  RT --> S[Specialist agents<br/>scoped re-retrieval with type weights;<br/>Projects agent: one chunk per project first]
  P --> S
  S --> M{Model available?}
  M -- no --> X[Extractive composer<br/>verified sentences + citations]
  M -- yes --> L[One grounded generation<br/>WebLLM or self-hosted server]
  L --> V{Response Validation Agent<br/>numbers · quantities · employers · names · citations · policy}
  V -- pass --> A[Answer + sources + cards + actions + follow-ups]
  V -- fail / hang / error --> X
  X --> A
```

### Agents

| Agent | Responsibility | Scope (chunk types) |
|---|---|---|
| Conversation Orchestrator | Guardrails, follow-up resolution, routing, merging, fallbacks | all |
| Professional Profile Agent | Background, experience, education, certifications | profile, experience, education, certification, milestone, fact |
| Technical Expertise Agent | Skills, frameworks, methods, where each skill was used | skill, project, article, experience |
| Project Intelligence Agent | Projects, architectures, agents, testing, results; breadth-first (one chunk per project) when no project is named | project, article, fact |
| Recruitment Assistant Agent | Availability, role fit, résumé, contact, freelance | profile, experience, skill, certification, education, fact, project |
| Portfolio Navigation Agent | Takes the visitor to the page they name (“open the certifications page”) or to a named project; only that page opens automatically | project, profile, certification, education, article, fact |
| Response Validation Agent | Deterministic fact-check of every model draft; replaces failing drafts | evidence given to the model |

Agents are prompts + retrieval scopes + type weights (`src/lib/assistant/agents.ts`), not separate model calls — that's what keeps it to one generation per question. Up to two specialists collaborate when routing scores are close.

### Personas and visitor modes

The six **interaction modes** — Professional overview, Recruiter, Technical deep dive, Student, Project explorer, AI conversation — are both site views and assistant personas, kept in sync in both directions: switching the view (navbar "View" menu, or a `?mode=technical` link) switches the assistant's persona even mid-conversation, and picking a mode in the assistant switches the view. Each mode re-orders the home page with CSS before first paint (`<html data-mode>`) and shapes answers **even without a model**:

| Mode | Routing prior | Instant-answer shape |
|---|---|---|
| Professional overview | profile +0.15 | lead + 3 points |
| Recruiter | recruiter +0.25, profile +0.15 | lead + 2 points; résumé/contact actions |
| Technical deep dive | technical +0.2, projects +0.15 | lead + 5 points; prefers project, skill and article evidence |
| Student | technical +0.1, profile +0.1 | lead + 3 points; prefers notes, certifications, education, milestones |
| Project explorer | projects +0.3 | lead + 4 points; prefers project evidence (project cards first) |
| AI conversation | — | lead + 2 points, conversational follow-ups |

Seven further audience personas (Data science, ML, GenAI, Agentic AI, Collaborator, Freelance, Explore) remain available under "Or tailor answers to an audience". With a model loaded, each mode/persona also adds an audience sentence and a style instruction to the prompt.

## 3. Knowledge base and RAG

- **Source of truth**: the same `content/*.json` and `content/articles/*.md` that render the site — no separate, drifting corpus. `src/lib/assistant/kb.ts` turns them into **209 self-contained chunks** (profile, experience summary and roles, project overview/stack/approach/features/architecture/agents/challenges/quality, per-skill evidence, certifications, education, milestones, article sections, recruitment facts, a portfolio-level project overview).
- **Served as** `/kb/knowledge.json` (static, 152 KB raw / 35 KB gzip). Only public portfolio content is included; private repositories are described as private, and nothing from source documents outside `content/` is indexed.
- **Embeddings**: `Xenova/bge-small-en-v1.5` (MIT, 33 M params, 384-d, int8 ONNX, CLS pooling, query instruction prefix). Built offline by `tools/kb/embed.ts` with transformers.js on Node (incremental, keyed by chunk hash), stored as int8 + per-vector scale in `/kb/embeddings.json` (222 KB raw / 154 KB gzip), plus vectors for the 144 suggested questions so the common path needs no model at all. At runtime the same model runs in a Web Worker (WASM); measured browser-vs-Node cosine for the same query: **1.00000**; ~0.1 s per query once loaded.
- **Retrieval**: BM25 (k1 1.4, b 0.6, title ×2, tags, synonym expansion at half weight) fused with dense cosine by a convex combination (0.55 lexical / 0.45 dense, each normalised). Reciprocal-rank fusion was tried first and dropped — it erased decisive BM25 margins (measured on the eval set). Entity boost for named projects (×1.6 overview, ×1.35 other chunks), per-agent type weights, and a mild ×1.12 prior for featured projects on open questions.
- **Vector store**: flat exact search in memory. With 209 vectors it takes well under a millisecond, is the accuracy upper bound, and needs no server. FAISS, Chroma and Qdrant were considered and rejected *at this size*: each adds a service (cost) or a large WASM bundle for no accuracy gain. Revisit with an HNSW index (e.g. a self-hosted Qdrant) beyond ~50 k chunks.
- **Unknown topics**: capitalised names absent from the knowledge base (“Content AI”, “Kubernetes”) produce a deterministic decline with the closest related facts — the model is never asked to improvise. Lower-case unknown words produce a caveat that the model must keep (the validator enforces it). Only the *asking* sentence(s) are checked: context such as “I am a hiring manager reviewing candidates…” before the question no longer produces “no information about ‘manager’” (found by the real-model agent run, regression-tested).

**Retrieval evaluation** (no model; `cd tools && npm run eval`, 38 ground-truth questions incl. follow-ups, unknowns and guardrails): hybrid **38/38**, retrieval hit 32/32, routing 32/32, keyword coverage 88 %, ~18 ms/question; BM25-only 36/38.

## 4. Models

Selection rule from the brief: *the smallest model that is reliable*. Candidates (all open-weight, permissive or community licences): Qwen2.5-0.5B, Gemma-3-1B, Llama-3.2-1B, Qwen2.5-1.5B, Qwen3-1.7B. Measured results are in **[benchmarks/README.md](benchmarks/README.md)** (generated from the raw JSON in the same folder).

How to read the numbers: because the validator replaces any draft that fails a fact check, *final* correctness is high for every model; the differentiator is **how often the model's own answer survives validation** and its speed.

| Model (Q4_K_M) | Final answers correct | Own drafts accepted by the validator | Keyword coverage | Unknowns declined | Decode tok/s (llama-bench, CPU) | Download (WebLLM) |
|---|---|---|---|---|---|---|
| **Qwen2.5-0.5B-Instruct** — default | 35/35 | 94 % (31/33) | 75 % | 3/3 | 14.3 | ~290 MB |
| Llama-3.2-1B-Instruct | 35/35 | 85 % (28/33) | 84 % | 3/3 | 8.5 | ~700 MB |
| Qwen2.5-1.5B-Instruct | 35/35 | 94 % (31/33) | 88 % | 3/3 | 7.0 | ~880 MB |
| Gemma-3-1B-it | 33/35 (preliminary run) | 61 % (preliminary) | 83 % (preliminary) | 2/3 | 10.8 | not offered |
| Qwen3-1.7B | 35/35 | **100 % (33/33)** — re-measured after the validator fix | 83 % | 3/3 | 6.9 | not offered |

All rows except Gemma-3-1B come from the final code. Qwen3-1.7B was re-run (7 Nov 2026) after the “AutoGen-based” validator false alarm was fixed (§9, [test report](ASSISTANT_TEST_REPORT.md) §3–4); the other rows were measured before that fix, which cannot change them — the fix only accepts more drafts, and none of their rejected drafts was flagged for a hyphenated name. Qwen2.5-0.5B was first published here as 97 %; that figure came from a benchmark metric bug (a rejected draft on an unknown-topic question was left out of its denominator, 31/32), fixed and regression-tested — see the [test report](ASSISTANT_TEST_REPORT.md) §3–4.

**Decision: Qwen2.5-0.5B-Instruct** (Apache-2.0) stays the default — but not because its drafts are better: on draft quality it is now measurably behind. Every model gives 35/35 correct final answers and declines 3/3 unknown topics, because the validator replaces any draft that fails. On the models' own drafts, **Qwen3-1.7B leads with 33/33 accepted**, ahead of Qwen2.5-0.5B and Qwen2.5-1.5B (31/33 each) and Llama-3.2-1B (28/33). Qwen3-1.7B gained two drafts over its first run, for two different reasons. One comes from the validator fix: replaying the 33 stored drafts through the previous validator rejects exactly one, `autogen`. The other is sampling variance at temperature 0.2: on `years` the model wrote “nearly three years”, as the evidence says. Qwen2.5-0.5B's two rejections are real model errors, each reproduced 2/2: a false decline on `architecture` and an invented “video editing agent” on `video-agent`. The validator catches both, so visitors still get correct, cited answers. The larger models also write richer answers (keyword coverage 88 % / 83 % vs 75 %). A single run at temperature 0.2 can move by about one draft (Qwen2.5-1.5B's `interesting` draft was accepted on one retry and rejected on the next), so the two-draft gap is a real but small signal.

What still favours Qwen2.5-0.5B is what it costs the visitor. It decodes roughly twice as fast on CPU (llama-bench 14.3 vs 7.0 / 6.9 tok/s, noisy). It is also a much smaller one-time download (GGUF 469 MB vs 1056 MB for Qwen3-1.7B; ~290 MB vs ~880 MB for Qwen2.5-1.5B in WebLLM), which visitors pay for with their own bandwidth and GPU memory. The brief's rule — *the smallest model that is reliable* — therefore still picks it, reading “reliable” as what the visitor sees (35/35 correct, with the validator as the safety net). Trading size and speed for Qwen3-1.7B's better drafts is an open product decision: Qwen3-1.7B is not in the in-browser catalogue, and its WebLLM download and speed have not been measured here. Qwen2.5-1.5B stays selectable for visitors who prefer richer answers. Gemma-3-1B was only measured in the preliminary run (older validator, busier machine) and not re-run. Recorded in `src/lib/assistant/models.ts` (`DEFAULT_BROWSER_MODEL_ID`).

### Inference engines considered

| Option | Verdict |
|---|---|
| **llama.cpp `llama-server`** (CPU/GPU, GGUF) | Used for the benchmark and recommended for tier C: tiny, OpenAI-compatible, `--api-key`, runs well on CPU. |
| **WebLLM** (MLC, WebGPU) | Used for tier B: runs in the visitor's browser, no server. |
| Ollama | Fine for tier C (same API); heavier than llama-server. |
| vLLM / TGI | Excellent throughput but need a CUDA GPU; overkill for a portfolio. |
| Transformers.js (WebGPU/WASM) for generation | Considered; WebLLM's quantised kernels are faster for chat models. Used for embeddings. |
| Free hosted inference (HF Inference API, etc.) | Rejected: rate-limited free tiers that become paid past a threshold — against the brief. |

### Real-hardware finding (tier B)

On the development laptop (Intel UHD Graphics 620, driver 31.0.101.2135, Edge 156 / Chromium 152) WebLLM **loads** Qwen2.5-0.5B in 9–33 s (q4f16 and q4f32) but **generation never completes** — after ~77 s the GPU device is lost. This reproduced in a visible Edge window and in the in-app browser. The site therefore:

1. runs a one-token **capability probe** right after loading (20 s limit) and refuses to enable the model on such GPUs, with a clear message;
2. keeps a **watchdog** on every generation (30 s to first token, 12 s between tokens) that aborts and answers from verified evidence, labelled *“AI model didn't respond — showing the verified instant answer”*, then switches the model off;
3. never auto-loads a model that failed.

On-device generation speed could therefore **not** be measured on this machine; see the limitations.

## 5. Security and privacy

| Threat | Control (deterministic unless noted) |
|---|---|
| Prompt injection in the question | Regex guardrails refuse before retrieval or any model call; prompts mark question/evidence as data (rule 7); the proxy re-runs the guardrails server-side. |
| Requests for unpublished personal data (phone, address, salary, age, IDs) | Private-info guardrail refuses and points to the contact page. |
| Hallucinated numbers, inflated quantities, invented employers/products, fake citations | Response Validation Agent; any hard finding replaces the draft with the extractive answer. |
| Model declines despite evidence / ignores a missing-topic caveat | Policy checks in the orchestrator replace the draft. |
| Using the optional proxy as a free general chatbot | Proxy accepts only `[system, user]` prompts carrying this assistant's signature, ≤ 400 output tokens, 16 k chars; same-origin check; 40 requests / 10 min / IP. |
| Leaking the inference server address or key | Only the server knows `INFERENCE_*`; `/api/assistant/status` returns a label and health only (tested). |
| Unsafe third-party code | CDN scripts are version-pinned (WebLLM 0.2.87, transformers.js 4.3.2 and the onnxruntime-web build it loads). The CSP allows exactly those three **package paths** on jsDelivr — not the whole host, which serves any npm package — plus Hugging Face / raw.githubusercontent for model files, workers from self/blob, and `'wasm-unsafe-eval'` (WebAssembly only, not JS `eval`). A test fails if the CSP and the pinned versions drift apart. |
| A self-hosted model server that hangs | The HTTP engine has its own watchdog (90 s to the first token — a slow CPU needs ~47 s just to read the prompt — then 20 s between tokens) and throws a plain error, so the visitor gets the verified answer. The proxy's 60 s limit covers only the wait for the upstream to start responding (it previously also cut off slow-but-healthy streams); a whole answer is capped at 180 s, and a disconnecting visitor cancels the upstream request. |
| Visitor tracking | Questions are processed in the browser (tiers A/B); conversation history lives in `sessionStorage` and is cleared with the tab or the *Clear* button. No analytics, no accounts. |
| Photo Studio abuse | Disabled unless `ADMIN_PASSWORD` + 32-char `ADMIN_SESSION_SECRET` are set; HMAC-signed HttpOnly, Secure, SameSite=Strict cookie (2 h); constant-time password check; 5 attempts / 15 min / IP; same-origin checks; images validated by magic bytes and dimensions (JPEG/PNG/WebP, 600–6000 px, ≤ 4 MB, size checked before reading); publishing requires approval + typed `PUBLISH` + `confirm=true` and only commits through a scoped GitHub token (it also points `profile.photo.src` at the photo); **reverting to the placeholder** requires typed `REMOVE` + `confirm=true` and only changes `profile.photo.src` (the image file stays in history); every GitHub call has a 20 s timeout and a clear error; enhancement only calls a self-hosted service you configure. `/admin` is `noindex` and disallowed in robots.txt. |

Rate limits are in-memory per serverless instance — good enough against casual abuse, not a distributed attack (use Vercel's firewall rules if that ever matters).

## 6. API

| Endpoint | Method | Purpose |
|---|---|---|
| `/kb/knowledge.json` | GET (static) | Chunks, personas, welcome text, catalogue (projects/certifications subset), employers, version hash. |
| `/kb/embeddings.json` | GET (static) | `{ model, dims, vectors: {id: {q, s}}, agents, queries, generatedAt }` — int8 base64 vectors with scale. |
| `/api/assistant/status` | GET | `{ server: { configured, healthy, model } }` — never the address or key. |
| `/api/assistant/llm` | POST | Tier-C proxy. Body `{ messages: [system, user], max_tokens ≤ 400, temperature?, json_schema? }` → OpenAI-style SSE stream. Errors: 400 invalid / unsupported prompt / guardrail, 403 cross-origin, 404 not configured, 413 too large, 429 rate limit, 502 upstream down. |
| `/api/admin/login` | POST / DELETE | `{ password }` → session cookie; DELETE signs out. 401, 403, 404 (not configured), 429. |
| `/api/admin/photo?action=enhance` | POST (image body) | Forwards to `PHOTO_ENHANCER_URL`; 501 if not configured. |
| `/api/admin/photo?action=publish&confirm=true` | POST (JPEG body) | Commits `public/images/ankit-chand.jpg` via the GitHub API; 400 without confirm, 501 if not configured, 413/422 invalid image. |

## 7. Setup and operations

Requirements: Node ≥ 22 (built and tested on 24.22.2). Nothing else for tiers A and B.

```bash
npm ci
npm run build
npm start
```

Rebuild embeddings after editing `content/` (offline tooling, not installed on Vercel):

```bash
cd tools && npm ci && npm run kb:embed
```

Tests and evaluations:

```bash
cd tools && npm test        # 29 assistant tests (guardrails, validator, eval set, fake-model contract) + 2 benchmark-tooling tests
cd tools && npm run eval    # retrieval/routing evaluation, keyword vs hybrid
npm test                    # contact API (needs a running server on :3000)
node scripts/webgpu-bench.mjs   # in-browser model benchmark in a visible Edge/Chrome window
```

The admin and proxy security suites (`tests/admin-api.test.mjs`, `tests/llm-proxy.test.mjs`) need a server started with *test* credentials and a fake upstream — the instructions are at the top of each file.

CPU model benchmark (downloads nothing itself; place GGUF files in `MODELS_DIR`):

```bash
cd tools && LLAMA_DIR=/path/to/llama.cpp MODELS_DIR=/path/to/models npm run bench -- qwen2.5-0.5b llama3.2-1b
node --no-warnings bench/report.ts
```

### Enabling tier C (optional, self-hosted)

On a machine you control (never expose a laptop port directly; put it behind HTTPS, e.g. a reverse proxy or a tunnel with access control):

```bash
llama-server -m qwen2.5-1.5b-instruct-q4_k_m.gguf --port 8080 -c 4096 -t 4 --jinja --api-key "<long random key>"
```

Then on Vercel set `INFERENCE_BASE_URL=https://your-host/v1`, `INFERENCE_API_KEY`, `INFERENCE_MODEL`, `INFERENCE_MODEL_LABEL` and redeploy. The assistant detects it through `/api/assistant/status` and prefers it over the in-browser model.

## 8. Runtime cost

| Item | Cost | Notes / thresholds |
|---|---|---|
| Vercel Hobby (static pages + a few small functions) | $0 | Hobby is for personal, non-commercial sites; usage limits pause rather than bill. |
| Knowledge base + embeddings | $0 | Static files on the same deployment (~190 KB gzip). |
| Embedding model and WebLLM weights | $0 | Downloaded by the visitor's browser from Hugging Face Hub; runtimes from jsDelivr. Both are free public CDNs with no account or key; if either is unreachable, tier A still answers (keyword retrieval + precomputed vectors). |
| Inference | $0 | Visitor's own device (tier B) or your own hardware (tier C). |
| **Total** | **$0 / month** | No API keys exist for any model provider. |

## 9. Known limitations

- **On-device AI needs a capable GPU.** It is opt-in, and on the development laptop (Intel UHD 620) generation hangs, so tier B was verified only up to “model loads + probe fails safely + watchdog fallback works”. Token/s for tier B on working hardware is unmeasured here.
- **Instant answers are extractive.** They are correct and cited but read like a summary of facts, and the lead sentence is the top-ranked chunk — e.g. “explain his multi-agent architecture” leads with the two-agent code generator before NexusAI.
- **Small models are weak writers.** The default model has 2 of 33 drafts rejected for real errors (a false decline, an invented “video editing agent”), and Qwen3-1.7B's 33/33 is a single run at temperature 0.2, not a guarantee. The validator is deliberately strict, so some acceptable phrasings are replaced by the instant answer. The one false alarm the benchmark showed on the final code (“AutoGen-based” flagged as an unknown name, which cost Qwen3-1.7B an accurate draft) is fixed: a known name followed by a common modifier suffix (-based, -powered, -driven, -style, …) is now accepted. The suffix list is deliberately short, so a known name joined to an unlisted word (say “AutoGen-centred”) is still judged as a whole name and can still be rejected — the strict side of the trade-off.
- **The validator is lexical.** It can't judge reasoning quality, only that names, numbers, quantities, employers and citations are supported; a fluent but misleading paraphrase built entirely from supported words could pass. Observed in the agent run: when NexusAI was missing from the evidence, Qwen2.5-0.5B listed a forecasting project among “multi-agent projects” and the draft passed (every name was real). Widening the Project agent's evidence fixed that case; category errors of this kind are still not detectable lexically.
- **English only**, and knowledge is only as current as `content/` (rebuild embeddings after edits; the tests fail if the build drifts).
- **Rate limits are per instance**, and the free CDNs (HF Hub, jsDelivr) are third-party dependencies outside this project's control.
