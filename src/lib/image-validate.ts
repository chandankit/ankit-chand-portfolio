/**
 * Server-side image validation by content, not by filename or declared type:
 * magic bytes for JPEG / PNG / WebP (SVG and everything else is rejected),
 * size limits and pixel dimensions parsed from the file header.
 */
export type ImageInfo = { type: "image/jpeg" | "image/png" | "image/webp"; width: number; height: number; bytes: number };

// 4 MB keeps uploads under the 4.5 MB serverless request-body limit.
export const PHOTO_LIMITS = { maxBytes: 4 * 1024 * 1024, minSide: 600, maxSide: 6000 };

export function inspectImage(buf: Uint8Array): ImageInfo | null {
  const b = buf;
  const u16be = (i: number) => (b[i] << 8) | b[i + 1];
  const u32be = (i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
  const u16le = (i: number) => b[i] | (b[i + 1] << 8);
  const u24le = (i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
  if (b.length < 32) return null;
  // PNG
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { type: "image/png", width: u32be(16), height: u32be(20), bytes: b.length };
  // JPEG: walk segments to the first SOFn marker
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1];
      const len = u16be(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { type: "image/jpeg", height: u16be(i + 5), width: u16be(i + 7), bytes: b.length };
      i += 2 + len;
    }
    return null;
  }
  // WebP (RIFF....WEBP)
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {
    const chunk = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (chunk === "VP8 ") return { type: "image/webp", width: u16le(26) & 0x3fff, height: u16le(28) & 0x3fff, bytes: b.length };
    if (chunk === "VP8L") {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return { type: "image/webp", width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, bytes: b.length };
    }
    if (chunk === "VP8X") return { type: "image/webp", width: u24le(24) + 1, height: u24le(27) + 1, bytes: b.length };
  }
  return null;
}

export function validatePhoto(buf: Uint8Array): { ok: true; info: ImageInfo } | { ok: false; error: string } {
  if (buf.length > PHOTO_LIMITS.maxBytes) return { ok: false, error: `Image is larger than ${PHOTO_LIMITS.maxBytes / 1048576} MB.` };
  const info = inspectImage(buf);
  if (!info) return { ok: false, error: "Only JPEG, PNG or WebP images are accepted." };
  if (Math.min(info.width, info.height) < PHOTO_LIMITS.minSide) return { ok: false, error: `Image must be at least ${PHOTO_LIMITS.minSide}×${PHOTO_LIMITS.minSide} pixels.` };
  if (Math.max(info.width, info.height) > PHOTO_LIMITS.maxSide) return { ok: false, error: `Image must be at most ${PHOTO_LIMITS.maxSide} pixels on its longest side.` };
  return { ok: true, info };
}
