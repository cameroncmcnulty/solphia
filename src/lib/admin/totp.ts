import type { AppState } from "@/lib/types";
import { durableConfigured, KEYS, kvDel, kvGetJson, kvSetJson } from "@/lib/persist";
import { totpEnabled, type TotpSlot } from "@/lib/auth/totp";

export function adminTotpOf(state: AppState): TotpSlot {
  if (!state.adminTotp) state.adminTotp = {};
  return state.adminTotp;
}

export async function pullAdminTotp(state: AppState): Promise<void> {
  if (!durableConfigured()) return;
  const raw = await kvGetJson(KEYS.adminTotp);
  if (raw && typeof raw === "object") {
    const slot = raw as TotpSlot;
    if (totpEnabled(slot) || slot.totpPendingSecret) state.adminTotp = slot;
  }
}

export async function saveAdminTotp(slot: TotpSlot | null): Promise<void> {
  if (!durableConfigured()) return;
  if (!slot || (!totpEnabled(slot) && !slot.totpPendingSecret)) {
    await kvDel(KEYS.adminTotp);
    return;
  }
  await kvSetJson(KEYS.adminTotp, slot);
}
