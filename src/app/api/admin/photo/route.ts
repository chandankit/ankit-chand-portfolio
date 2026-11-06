import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySession } from "@/lib/admin-auth";
import { PHOTO_LIMITS, validatePhoto } from "@/lib/image-validate";

/**
 * Photo Studio backend. Two explicitly-authorised operations:
 *
 *  POST ?action=enhance  — forwards the image to a SELF-HOSTED open-source
 *                          enhancement service (PHOTO_ENHANCER_URL; e.g. rembg
 *                          for background removal or Real-ESRGAN for upscaling)
 *                          and returns the result for preview. Nothing is saved.
 *  POST ?action=publish  — commits the approved image to the GitHub repository
 *                          (GITHUB_TOKEN + GITHUB_REPO), which triggers the
 *                          normal reviewed deploy. Requires confirm=true.
 *
 * Both require an admin session; neither runs unless configured.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PHOTO_PATH = "public/images/ankit-chand.jpg";

export async function POST(req: NextRequest) {
  if (!verifySession(req.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  // Defence in depth on top of the SameSite=Strict session cookie.
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && host && origin.replace(/^https?:\/\//, "") !== host) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  // Refuse oversized bodies before reading them into memory.
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > PHOTO_LIMITS.maxBytes) return NextResponse.json({ error: `The image is larger than ${PHOTO_LIMITS.maxBytes / 1048576} MB.` }, { status: 413 });
  const action = req.nextUrl.searchParams.get("action");
  const buf = new Uint8Array(await req.arrayBuffer());
  if (buf.byteLength > PHOTO_LIMITS.maxBytes) return NextResponse.json({ error: `The image is larger than ${PHOTO_LIMITS.maxBytes / 1048576} MB.` }, { status: 413 });
  const v = validatePhoto(buf);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 422 });

  if (action === "enhance") {
    const url = process.env.PHOTO_ENHANCER_URL;
    if (!url)
      return NextResponse.json(
        { error: "No enhancement service is connected. Set PHOTO_ENHANCER_URL to a self-hosted open-source service (for example rembg or Real-ESRGAN behind a small HTTP endpoint) to enable this." },
        { status: 501 },
      );
    const up = await fetch(url, { method: "POST", headers: { "Content-Type": v.info.type }, body: buf, signal: AbortSignal.timeout(60_000) }).catch(() => null);
    if (!up?.ok) return NextResponse.json({ error: "The enhancement service did not respond." }, { status: 502 });
    const out = new Uint8Array(await up.arrayBuffer());
    const check = validatePhoto(out);
    if (!check.ok) return NextResponse.json({ error: `Enhanced image rejected: ${check.error}` }, { status: 502 });
    return new Response(out, { headers: { "Content-Type": check.info.type, "Cache-Control": "no-store" } });
  }

  if (action === "publish") {
    if (req.nextUrl.searchParams.get("confirm") !== "true") return NextResponse.json({ error: "Publishing requires explicit confirmation." }, { status: 400 });
    if (v.info.type !== "image/jpeg") return NextResponse.json({ error: "Publish the studio's exported JPEG." }, { status: 422 });
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO; // "owner/name"
    if (!token || !repo) return NextResponse.json({ error: "Publishing isn't connected. Download the approved image and replace public/images/ankit-chand.jpg, or set GITHUB_TOKEN and GITHUB_REPO." }, { status: 501 });
    const api = `https://api.github.com/repos/${repo}/contents/${PHOTO_PATH}`;
    const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "portfolio-photo-studio" };
    const current = await fetch(api, { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const put = await fetch(api, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Update profile photo (approved in Photo Studio)", content: Buffer.from(buf).toString("base64"), sha: current?.sha }),
    });
    if (!put.ok) return NextResponse.json({ error: `GitHub rejected the update (${put.status}).` }, { status: 502 });
    const j = await put.json();
    return NextResponse.json({ ok: true, commit: j.commit?.html_url });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
