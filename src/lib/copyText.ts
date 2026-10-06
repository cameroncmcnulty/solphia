/** Copy in the click gesture. Clipboard API often fails in-app / non-HTTPS; execCommand is the fallback. */
export function copyText(text: string): boolean {
  if (typeof document === "undefined" || !text) return false;
  let ok = false;
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.setAttribute("aria-hidden", "true");
    el.style.cssText =
      "position:fixed;top:0;left:0;width:2px;height:2px;padding:0;border:none;outline:none;box-shadow:none;background:transparent;opacity:0;";
    document.body.appendChild(el);
    el.focus();
    el.select();
    el.setSelectionRange(0, text.length);
    ok = document.execCommand("copy");
    el.remove();
  } catch {
    ok = false;
  }
  const clip = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
  if (clip?.writeText) {
    void clip.writeText(text).catch(() => undefined);
    return true;
  }
  return ok;
}
