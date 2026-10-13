export const RETIRED_AUTH_MESSAGE =
  "Create or import a Solphia wallet. Email and Google sign-in are retired.";

export function retiredAuthBody() {
  return { error: "gone" as const, message: RETIRED_AUTH_MESSAGE };
}
