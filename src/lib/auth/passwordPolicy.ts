export const PASSWORD_HINT = "8–72 characters, with uppercase, lowercase, and a symbol.";

export function passwordRules(password: string): { length: boolean; lower: boolean; upper: boolean; symbol: boolean } {
  const p = password || "";
  return {
    length: p.length >= 8 && p.length <= 72,
    lower: /[a-z]/.test(p),
    upper: /[A-Z]/.test(p),
    symbol: /[^A-Za-z0-9]/.test(p),
  };
}

export function passwordIssue(password: string): string | null {
  const r = passwordRules(password);
  if (!r.length) return PASSWORD_HINT;
  if (!r.lower) return "Password needs a lowercase letter.";
  if (!r.upper) return "Password needs an uppercase letter.";
  if (!r.symbol) return "Password needs a symbol.";
  return null;
}

export function passwordOk(password: string): boolean {
  return passwordIssue(password) === null;
}
