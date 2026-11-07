/**
 * Photo Studio publishing. The site deploys from its GitHub repository, so "publishing" is
 * a commit made through GitHub's contents API with a fine-grained token (GITHUB_TOKEN,
 * contents: write on GITHUB_REPO only). Every call has a timeout and failures surface as
 * PublishError with a message safe to show the signed-in admin.
 *
 *  publishPhoto        — commits the approved JPEG, then makes sure content/profile.json
 *                        points at it (a site showing the placeholder starts showing it).
 *  revertToPlaceholder — sets profile.photo.src to null, so every page shows the neutral
 *                        placeholder. The old image file stays in the repository's history.
 */
export const PHOTO_PATH = "public/images/ankit-chand.jpg";
export const PHOTO_SRC = "/images/ankit-chand.jpg";
export const PROFILE_PATH = "content/profile.json";

export type GitHubTarget = { token: string; repo: string; api: string; timeoutMs?: number };

export class PublishError extends Error {}

export function githubTarget(env: Record<string, string | undefined> = process.env): GitHubTarget | null {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO || !/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPO)) return null;
  // GITHUB_API_URL exists for tests against a local fake; production uses api.github.com.
  return { token: env.GITHUB_TOKEN, repo: env.GITHUB_REPO, api: (env.GITHUB_API_URL || "https://api.github.com").replace(/\/$/, "") };
}

const b64 = (data: Uint8Array | string) => Buffer.from(data).toString("base64");

async function call(gh: GitHubTarget, method: "GET" | "PUT", path: string, body?: unknown): Promise<Response> {
  try {
    return await fetch(`${gh.api}/repos/${gh.repo}/contents/${path}`, {
      method,
      headers: { Authorization: `Bearer ${gh.token}`, Accept: "application/vnd.github+json", "User-Agent": "portfolio-photo-studio", ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(gh.timeoutMs ?? 20_000),
    });
  } catch {
    throw new PublishError("GitHub did not respond. Nothing was changed; try again.");
  }
}

async function readFile(gh: GitHubTarget, path: string): Promise<{ sha: string; text: string } | null> {
  const r = await call(gh, "GET", path);
  if (r.status === 404) return null;
  if (!r.ok) throw new PublishError(`GitHub returned ${r.status} while reading ${path}.`);
  const j = (await r.json()) as { sha: string; content?: string };
  return { sha: j.sha, text: Buffer.from(j.content ?? "", "base64").toString("utf8") };
}

async function writeFile(gh: GitHubTarget, path: string, contentB64: string, message: string, sha?: string): Promise<string | undefined> {
  const r = await call(gh, "PUT", path, { message, content: contentB64, ...(sha ? { sha } : {}) });
  if (!r.ok) throw new PublishError(`GitHub rejected the change to ${path} (${r.status}).`);
  const j = (await r.json().catch(() => ({}))) as { commit?: { html_url?: string } };
  return j.commit?.html_url;
}

/** Rewrites only the value of "photo": { "src": … } so the rest of the file is untouched. */
export function setPhotoSrc(profileJson: string, src: string | null): string {
  const re = /("photo"\s*:\s*\{\s*"src"\s*:\s*)(null|"(?:[^"\\]|\\.)*")/;
  if (!re.test(profileJson)) throw new PublishError(`${PROFILE_PATH} has no "photo": { "src": … } field.`);
  return profileJson.replace(re, `$1${src === null ? "null" : JSON.stringify(src)}`);
}

export async function publishPhoto(gh: GitHubTarget, jpeg: Uint8Array): Promise<{ commits: string[] }> {
  const commits: string[] = [];
  const existing = await readFile(gh, PHOTO_PATH);
  const c1 = await writeFile(gh, PHOTO_PATH, b64(jpeg), "Update profile photo (approved in Photo Studio)", existing?.sha);
  if (c1) commits.push(c1);
  const profile = await readFile(gh, PROFILE_PATH);
  if (!profile) throw new PublishError(`${PROFILE_PATH} was not found in ${gh.repo}.`);
  const next = setPhotoSrc(profile.text, PHOTO_SRC);
  if (next !== profile.text) {
    const c2 = await writeFile(gh, PROFILE_PATH, b64(next), "Show the published profile photo (approved in Photo Studio)", profile.sha);
    if (c2) commits.push(c2);
  }
  return { commits };
}

export async function revertToPlaceholder(gh: GitHubTarget): Promise<{ commits: string[]; unchanged: boolean }> {
  const profile = await readFile(gh, PROFILE_PATH);
  if (!profile) throw new PublishError(`${PROFILE_PATH} was not found in ${gh.repo}.`);
  const next = setPhotoSrc(profile.text, null);
  if (next === profile.text) return { commits: [], unchanged: true };
  const c = await writeFile(gh, PROFILE_PATH, b64(next), "Show the profile-photo placeholder (approved in Photo Studio)", profile.sha);
  return { commits: c ? [c] : [], unchanged: false };
}
