/** Site-wide page scroll. Shill is a fixed overlay and must not leave html/body locked. */
export function clearScrollLock() {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  const body = document.body;
  html.style.overflow = "";
  html.style.height = "";
  body.style.overflow = "";
  body.style.height = "";
  body.style.position = "";
  body.style.top = "";
  body.style.width = "";
}

export function lockPageScroll() {
  if (typeof document === "undefined") return;
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
}
