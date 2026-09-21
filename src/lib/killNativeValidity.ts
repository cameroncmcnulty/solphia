/**
 * WebKit (Chrome/Safari/Phantom on iOS) shows "The string did not match the
 * expected pattern" via HTML constraint validation — even with no pattern=
 * attribute — for file inputs and some implicit form submits.
 * Elements with willValidate === false are barred from that check.
 */
export function killNativeValidity(): () => void {
  if (typeof window === "undefined") return () => {};
  const ctors: Array<{ proto: any; name: string }> = [];
  for (const C of [HTMLInputElement, HTMLSelectElement, HTMLTextAreaElement, HTMLButtonElement, HTMLFormElement]) {
    if (C?.prototype) ctors.push({ proto: C.prototype, name: C.name });
  }
  const undo: Array<() => void> = [];
  for (const { proto } of ctors) {
    try {
      const desc = Object.getOwnPropertyDescriptor(proto, "willValidate");
      Object.defineProperty(proto, "willValidate", {
        configurable: true,
        enumerable: desc?.enumerable ?? false,
        get() {
          return false;
        },
      });
      if (desc) undo.push(() => Object.defineProperty(proto, "willValidate", desc));
    } catch {
      /* some engines store willValidate on the instance */
    }
    for (const fn of ["checkValidity", "reportValidity"] as const) {
      if (typeof proto[fn] !== "function") continue;
      const prev = proto[fn];
      proto[fn] = function () {
        return true;
      };
      undo.push(() => {
        proto[fn] = prev;
      });
    }
  }
  const stopInvalid = (e: Event) => {
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  document.addEventListener("invalid", stopInvalid, true);
  undo.push(() => document.removeEventListener("invalid", stopInvalid, true));
  return () => {
    for (const fn of undo.reverse()) {
      try {
        fn();
      } catch {
        /* ignore */
      }
    }
  };
}
