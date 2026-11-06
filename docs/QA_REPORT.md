# QA Report — ankit-chand-portfolio

**Production URL:** https://ankit-chand-portfolio.vercel.app
**Tested:** 6 Nov 2026 · Next.js 16.4.5 · Node 24 LTS · hosted on Vercel (HTTPS, global CDN)

## 1. Summary

| Area | Result |
|---|---|
| Production build | ✅ `next build` passes — 59 statically generated routes + 1 serverless API route, TypeScript strict, content schema validation |
| Public access | ✅ All pages, resume PDF and project details load over HTTPS with **no login**, from fresh InPrivate profiles |
| Functional browser QA | ✅ **21/21 scenarios clean** (desktop, tablet, phone; dark + light) — no console errors, failed requests, HTTP errors or horizontal overflow |
| Links & assets | ✅ 31 sitemap pages, 133 internal URLs (pages, images, PDF, scripts) → all 200; 11 GitHub repo links → 200 |
| Contact API security | ✅ 8/8 tests pass on production (405, 415, 403 cross-origin, 400 validation, 413 size, honeypot, time-trap, delivery/503) + rate limit verified (6th request → 429) |
| Lighthouse | ✅ Accessibility **100**, Best practices **100**, SEO **100** on every page tested · Performance desktop **93–100** · mobile see §5 |
| Security headers | ✅ CSP, HSTS (preload), X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-Frame-Options; `X-Powered-By` removed |
| Privacy | ✅ No phone number or personal identifiers in pages or resume PDF; photo metadata stripped; content scanner for phone numbers/keys/local paths |

## 2. Test matrix (fresh-profile browser QA)

Run with `BASE_URL=https://ankit-chand-portfolio.vercel.app node scripts/qa-browser.mjs`. Each scenario uses Microsoft Edge (Chromium) headless with a **new, empty InPrivate profile** — no cookies, history or signed-in sessions — and records console errors, exceptions, failed requests, HTTP ≥ 400 and horizontal overflow. Results: `docs/screenshots/qa-results.json`.

| # | Scenario | Device | Theme | Result |
|---|---|---|---|---|
| 01–02 | Home (viewport + full page) | 1440×900 | dark | ✅ |
| 03–04 | Project catalogue, filtered by `?category=Agentic AI` | 1440×900 | dark | ✅ |
| 05 | NexusAI case study — interactive architecture block selected | 1440×900 | dark | ✅ |
| 06 | Experience timeline | 1440×900 | dark | ✅ |
| 07 | Skills explorer — skill expanded to show evidence | 1440×900 | dark | ✅ |
| 08 | Certification detail dialog | 1440×900 | dark | ✅ |
| 09 | Command palette search ("autogen") | 1440×900 | dark | ✅ |
| 10 | Resume preview + download | 1440×900 | dark | ✅ |
| 11 | Contact | 1440×900 | dark | ✅ |
| 12 | Knowledge article | 1440×900 | dark | ✅ |
| 13 | Home, light theme | 1440×900 | light | ✅ |
| 14–15 | About, Achievements | 820×1180 tablet | dark | ✅ |
| 16–19 | Home, mobile menu open, project page, catalogue | 390×844 phone (2×) | dark | ✅ |
| 20 | Contact | 390×844 phone | light | ✅ |
| 21 | Unknown URL → custom 404 page | 1440×900 | dark | ✅ |

**Browsers:** Chromium engine (Microsoft Edge, Chrome-equivalent) verified on this machine; Chrome and Firefox were not installed here. The site uses only standard, widely supported APIs (`<dialog>`, CSS `color-mix`, IntersectionObserver) with progressive-enhancement fallbacks.

**Manual interaction checks (in-app browser):** project search ("FAISS" → RAG project), category/type filters with shareable URLs, clear filters, architecture diagram selection, Ctrl/⌘ K palette (focus, typing, Enter navigation, close), theme toggle + persistence across reloads, credentials dropdown, mobile menu, back-to-top, certification dialog (Esc closes, focus returns), contact form (client validation, focus to first error, pre-filled subject from "Request a walkthrough", 503 fallback to pre-filled email).

## 3. Contact API tests

`BASE_URL=https://ankit-chand-portfolio.vercel.app npm test`

```
✔ GET is rejected with 405
✔ non-JSON content type is rejected with 415
✔ cross-origin POST is rejected with 403
✔ invalid fields return 400 with field errors
✔ oversized body is rejected with 413
✔ honeypot submissions get a silent fake success
✔ too-fast submissions are flagged
✔ valid message is delivered, or 503 when no inbox is configured
ℹ tests 8 · pass 8 · fail 0
```

Rate limiting: 5 requests per client per 10 minutes, then `429` with `Retry-After`; `X-RateLimit-Remaining` header exposed.

## 4. Defects found during testing and fixed (root cause → fix)

| # | Defect | Root cause | Fix |
|---|---|---|---|
| 1 | Page content invisible until JavaScript loaded (blank first paint on slow networks, for no-JS crawlers) | Page-transition wrapper and scroll-reveal sections rendered `opacity:0` in server HTML | CSS-driven animations; hidden start state only when JS runs, plus a safety timer if hydration is slow |
| 2 | Typing after Ctrl/⌘ K did nothing | `dialog.showModal()` focused the first focusable node (the palette container), not the input | Explicitly focus the input after opening |
| 3 | Palette showed unrelated results ("autogen" → "Credit Risk") | Default fuzzy subsequence matching | Whole-term matching, title matches ranked first |
| 4 | Navbar text unreadable over content when scrolled | Glass background too transparent | 82% solid background + blur |
| 5 | Dark text on gradient buttons failed contrast in light theme | Same text colour in both themes | White text on gradients in light theme |
| 6 | Resume PDF printed with dark margins | Theme library sets inline `color-scheme: dark` on `<html>`, overriding print CSS | `color-scheme: light !important` in print media |
| 7 | Resume PDF ran to 3 pages; URL wrapped mid-word | Layout density; inline contact line | Tightened print layout (2 pages), no-wrap contact items |
| 8 | `/favicon.ico` 404 on every page load | Only an SVG icon existed | Multi-size `favicon.ico` + Apple touch icon |
| 9 | Mobile main-thread cost high | Large animated `blur()` layers; search index embedded in every page; animation + search libraries loaded globally | Removed redundant blur filters; static `/search-index.json` fetched on demand (−24 KB HTML/page); palette UI lazy-loaded; animation library scoped to interactive pages |
| 10 | Small grey labels < 4.5:1 contrast; skipped heading level; logo/search/repo-link accessible names didn't contain visible text | Token value; card heading level; aria-labels | `--subtle` raised to ≥ 4.8:1 in both themes; h2 cards under h1; labels include visible text |
| 11 | CSP violation logged on contact page | Zod 4 probes `new Function()` (blocked by CSP) | `z.config({ jitless: true })` |
| 12 | "Send message" button wrapped onto two lines | Flex shrink | `shrink-0 whitespace-nowrap` |

Investigated and **not** defects: an apparent rate-limiter miss (test mixed IPv4/IPv6 clients — two separate counters); headless screenshots showing frozen animations / cut-off mobile layout (headless virtual-time and minimum-window-width artefacts — verified correct with proper device emulation: 15 page types, 0 px horizontal overflow at 390 px).

## 5. Performance

| Page | Desktop | Mobile (simulated) | LCP mobile | CLS |
|---|---|---|---|---|
| Home | 93 | 66 | 3.2 s | 0 |
| Projects | 100 | 70 | 2.9 s | 0 |
| NexusAI case study | 98 | 77 | 2.9 s | 0 |
| Contact | — | 83 | 2.7 s | 0 |

All pages are statically pre-rendered and served from Vercel's CDN (typical server response < 100 ms; FCP desktop 0.4–0.6 s).
**Caveat:** Lighthouse's mobile score simulates a 4× slower CPU *on top of* the measuring machine. This machine's CPU benchmark index was 223–350 (Lighthouse expects ≈ 1,000+ for reliable mobile results), so the mobile figures above are pessimistic. For an authoritative mobile score, run https://pagespeed.web.dev on the production URL (the keyless API quota was exhausted on the test day).

## 6. SEO

Unique titles and meta descriptions on every page, canonical URLs, Open Graph + Twitter cards with generated social images (site-wide and per project), JSON-LD (`Person`, `SoftwareSourceCode`/`CreativeWork` per project, `TechArticle` per note), `sitemap.xml` (31 URLs), `robots.txt`, web manifest, one `<h1>` per page, descriptive URLs (`/projects/nexusai`).

## 7. Known limitations & future improvements

- **Contact delivery** needs a provider key (`RESEND_API_KEY` + `CONTACT_TO_EMAIL`, or `CONTACT_WEBHOOK_URL`) in Vercel. Until then the form validates, protects and falls back to a pre-filled email.
- **Rate limiting** is per serverless instance (in-memory). For strict global limits, add Upstash Redis / Vercel KV.
- **Certificates** have no images, dates or verification links yet; add them in `content/certifications.json`.
- **Private projects** (NexusAI, IntelliHub) have no public code or demo video; a short mock-mode demo video would strengthen them.
- **Mobile JS**: further gains possible by trimming client components on content pages (React Server Components only) and self-hosting fewer font weights.
- **Cross-browser**: verified on Chromium (Edge); run a quick pass on Firefox and Safari/iOS.
- **Custom domain**: add one under Vercel → Project → Domains; `NEXT_PUBLIC_SITE_URL` then sets canonical URLs.
