/** Magic-byte image sniff. Works in Node and the browser. */

export function normalizeImageMime(mime: string): string {
  const m = (mime || "").split(";")[0].trim().toLowerCase();
  if (m === "image/jpg" || m === "image/pjpeg" || m === "image/x-jpeg") return "image/jpeg";
  if (m === "image/x-png" || m === "image/apng") return "image/png";
  if (m === "image/heif" || m === "image/heic-sequence") return "image/heic";
  if (m === "image/tif") return "image/tiff";
  if (m === "image/x-icon" || m === "image/vnd.microsoft.icon") return "image/x-icon";
  return m;
}

export function sniffImageMime(buf: Uint8Array, declared = ""): string {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.length >= 6 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "image/gif";
  if (buf.length >= 12 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "image/webp";
  if (buf.length >= 2 && buf[0] === 0x42 && buf[1] === 0x4d) return "image/bmp";
  if (buf.length >= 4 && buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01 && buf[3] === 0x00) return "image/x-icon";
  if (
    buf.length >= 4 &&
    ((buf[0] === 0x49 && buf[1] === 0x49 && buf[2] === 0x2a && buf[3] === 0x00) ||
      (buf[0] === 0x4d && buf[1] === 0x4d && buf[2] === 0x00 && buf[3] === 0x2a))
  ) {
    return "image/tiff";
  }
  if (buf.length >= 12 && buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    const brand = String.fromCharCode(buf[8], buf[9], buf[10], buf[11]).toLowerCase();
    if (brand.startsWith("avif") || brand === "avis") return "image/avif";
    if (brand.startsWith("hei") || brand === "mif1" || brand === "msf1") return "image/heic";
  }
  const head = new TextDecoder("utf-8", { fatal: false }).decode(buf.slice(0, 160)).trimStart().toLowerCase();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) return "image/svg+xml";
  const declaredMime = normalizeImageMime(declared);
  if (declaredMime.startsWith("image/") && declaredMime !== "image/svg+xml") return declaredMime;
  return "";
}

export function imageExt(mime: string): string {
  const m = normalizeImageMime(mime);
  if (m.includes("json")) return "json";
  if (m === "image/png") return "png";
  if (m === "image/jpeg") return "jpg";
  if (m === "image/webp") return "webp";
  if (m === "image/gif") return "gif";
  if (m === "image/svg+xml") return "svg";
  if (m === "image/avif") return "avif";
  if (m === "image/bmp") return "bmp";
  if (m === "image/heic") return "heic";
  if (m === "image/tiff") return "tif";
  if (m === "image/x-icon") return "ico";
  if (m.startsWith("image/")) {
    const sub = m.slice(6).replace("+xml", "").replace(/[^a-z0-9]/g, "");
    return sub.slice(0, 8) || "jpg";
  }
  return "jpg";
}

export function isBrowserImage(mime: string): boolean {
  const m = normalizeImageMime(mime);
  return (
    m === "image/jpeg" ||
    m === "image/png" ||
    m === "image/gif" ||
    m === "image/webp" ||
    m === "image/svg+xml" ||
    m === "image/avif"
  );
}

export const SITE_IMAGE_MAX_BYTES = 4_000_000;
