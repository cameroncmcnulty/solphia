"use client";

import { FieldError, useConfirmErrors } from "@/components/form/confirm";
import { socialHref } from "@/lib/launch/links";
import { useAdmin } from "../AdminProvider";
import { Field } from "../ui";

export function SphaSection() {
  const { data, busy, patch, sphaX, setSphaX, sphaTg, setSphaTg, sphaDc, setSphaDc } = useAdmin();
  const err = useConfirmErrors<"x" | "telegram" | "discord">();
  if (!data) return null;

  return (
    <section className="panel rounded-2xl p-5">
      <div className="font-mono text-[10px] tracking-[0.3em] text-mute">$SPHA · SOCIALS</div>
      <p className="mt-2 max-w-2xl text-sm text-mute">
        Icons always show on the token page in Solphia teal. Empty fields stay decorative — they do not link until you save a URL or
        handle.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div>
          <Field
            field="x"
            value={sphaX}
            error={err.errors.x}
            onChange={(v) => {
              setSphaX(v);
              err.clear("x");
            }}
            placeholder="X / @handle"
          />
          <FieldError error={err.errors.x} />
        </div>
        <div>
          <Field
            field="telegram"
            value={sphaTg}
            error={err.errors.telegram}
            onChange={(v) => {
              setSphaTg(v);
              err.clear("telegram");
            }}
            placeholder="Telegram / t.me/…"
          />
          <FieldError error={err.errors.telegram} />
        </div>
        <div>
          <Field
            field="discord"
            value={sphaDc}
            error={err.errors.discord}
            onChange={(v) => {
              setSphaDc(v);
              err.clear("discord");
            }}
            placeholder="Discord / discord.gg/…"
          />
          <FieldError error={err.errors.discord} />
        </div>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          const issues: Partial<Record<"x" | "telegram" | "discord", string>> = {};
          if (sphaX.trim() && !socialHref("x", sphaX)) issues.x = "Use an X handle or x.com/… link.";
          if (sphaTg.trim() && !socialHref("telegram", sphaTg)) issues.telegram = "Use a Telegram handle or t.me/… link.";
          if (sphaDc.trim() && !socialHref("discord", sphaDc)) issues.discord = "Use a discord.gg invite.";
          if (Object.keys(issues).length) {
            err.fail(issues);
            return;
          }
          err.ok();
          patch({ sphaSocials: { x: sphaX, telegram: sphaTg, discord: sphaDc } });
        }}
        className="btn-acid mt-4 rounded-full px-5 py-2 text-sm disabled:opacity-40"
      >
        Save $SPHA socials
      </button>
    </section>
  );
}
