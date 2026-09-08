"use client";

/** Fixed, non-stretching wireframe of Solphia. Viewport-locked so token cards cannot warp her. */
export function SolphiaConstellation() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/solphia-constellation.jpg?v=1"
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full object-contain object-right opacity-[0.26]"
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_28%_18%,rgba(153,69,255,0.10),transparent_42%),linear-gradient(to_right,rgba(4,0,10,0.72)_0%,rgba(4,0,10,0.28)_46%,transparent_72%),linear-gradient(to_bottom,transparent_58%,rgba(4,0,10,0.78)_100%)]" />
    </div>
  );
}
