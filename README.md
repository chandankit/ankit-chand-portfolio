# Ankit Chand — Portfolio

Personal portfolio of **Ankit Chand**, Data Scientist and Generative AI & Agentic AI Engineer.
A fast, accessible, content-driven site built with **Next.js 16 (App Router), TypeScript, Tailwind CSS v4 and Motion**, with a secure serverless contact API.

## Features

| Area | What it does |
|---|---|
| **Home** | Animated hero (portrait as the "orchestrator" with orbiting agent capabilities), highlights, expertise, featured projects, dashboard-style quick navigation |
| **Projects** | Searchable, filterable catalogue (category, type, free text) with shareable URLs (`/projects?category=Agentic%20AI`) |
| **Case studies** | Problem, objective, **interactive architecture diagram**, agents & tools, approach, features, challenges (accordions), testing, screenshot gallery with lightbox |
| **Experience** | Expandable timeline with responsibilities, technologies and linked projects |
| **Skills** | Technology explorer — every skill links to the projects that used it (no invented percentages) |
| **Certifications** | Filterable gallery with detail dialogs; supports certificate images/PDFs and verification links |
| **Education · Achievements** | Academic record, coursework, filterable milestone timeline |
| **Knowledge** | Markdown engineering notes with topic filters and a learning map |
| **Resume** | Inline PDF preview, download, and a printable web version the PDF is generated from |
| **Contact** | Validated form → serverless API with honeypot, time-trap, rate limit, origin check; email via Resend and/or webhook; mailto fallback |
| **Site-wide** | Ctrl/⌘ K command palette search, dark/light theme, page transitions, back-to-top, mobile menu, reduced-motion support |
| **SEO** | Per-page metadata, Open Graph images (generated), JSON-LD (Person, SoftwareSourceCode, TechArticle), sitemap.xml, robots.txt, manifest |
| **Security** | CSP and hardened headers, no secrets in the client, server-only delivery credentials, content privacy scan |

## Quick start

```bash
npm install
cp .env.example .env.local     # optional: only needed for contact-form delivery
npm run dev                    # http://localhost:3000
```

Requires Node.js ≥ 20.9.

| Script | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | TypeScript check |
| `npm run validate:content` | JSON + asset checks, privacy/secret scan of `/content` |
| `npm test` | Contact API tests against a running server (`BASE_URL`, default `http://localhost:3000`) |
| `npm run resume:pdf` | Regenerate `public/resume/Ankit_Chand_Resume.pdf` from `/resume/print` (server must be running) |

## Updating content (no code changes)

All content lives in **`/content`** and is validated with zod at build time — a typo fails the build with a clear message instead of shipping a broken page.

| To… | Edit |
|---|---|
| Change name, headline, intro, email, social links, highlights, About text | `content/profile.json` |
| Add or update a job | `content/experience.json` (dates as `YYYY-MM`; `"end": null` = current) |
| Add a project | `content/projects.json` — copy an existing entry; `architecture` (optional) powers the interactive diagram; images go in `public/images/projects/` |
| Add a skill | `content/skills.json` — list project slugs under `evidence` |
| Add a certification | `content/certifications.json` — put the image/PDF in `public/certificates/` and set `file`; add `verifyUrl` if there is one |
| Add education / milestones | `content/education.json`, `content/milestones.json` |
| Write a note | add `content/articles/<slug>.md` with frontmatter (`title`, `summary`, `date`, `topics`, `relatedProjects`) |
| Replace the resume | overwrite `public/resume/Ankit_Chand_Resume.pdf` (or run `npm run resume:pdf`), and update `resume.updated` in `profile.json`. To host it elsewhere, set `resume.file` to a full URL. |

Commit and push — the hosting platform rebuilds and redeploys automatically. There is deliberately **no public editing interface**; content changes go through Git, which gives history, review and rollback for free.

## Contact form delivery

Configure **either or both** in the hosting provider's environment variables (never in code):

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` | Send each message as an email via [Resend](https://resend.com) |
| `CONTACT_WEBHOOK_URL` | POST each message as JSON to Slack / Discord / Make / Zapier |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL (optional on Vercel) |

Without a delivery channel the API answers `503 not_configured` and the form offers a pre-filled email draft, so no message is lost.

**Protections:** zod validation (client and server), 10 KB body limit, JSON-only, same-origin check, hidden honeypot field (bots get a silent fake success), minimum fill time, link-count limit, per-IP rate limit (5 per 10 minutes, per server instance), HTML-escaped email bodies, `Cache-Control: no-store`.

## Deployment (Vercel)

```bash
npx vercel login
npx vercel deploy --prod
```

Or import the GitHub repository at vercel.com/new — every push to `main` deploys. Add the environment variables above, then redeploy. HTTPS is automatic; custom domains are added under Project → Settings → Domains.

## Project structure

```
content/              ← all portfolio content (JSON + Markdown)
public/images/        ← portrait and project screenshots
public/resume/        ← downloadable resume PDF
src/app/              ← routes (App Router), API route, sitemap, robots, OG images
src/components/       ← UI components (client components are marked "use client")
src/lib/              ← content loading & schemas, search index, contact logic
scripts/              ← resume PDF generator, content validator
tests/                ← contact API tests (node:test)
```

## Privacy

Only professional information is published. The public resume omits the phone number; screenshots come from public notebooks and contain no personal data; `validate:content` scans content for phone numbers, API keys and local paths before you commit.
