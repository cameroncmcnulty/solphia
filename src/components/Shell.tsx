"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Nav } from "./Nav";
import { ParticleField } from "./ParticleField";
import { BottomNav } from "./BottomNav";
import { LiveRunner } from "./LiveRunner";
import { SeatRunner } from "./SeatRunner";
import { ReferralCapture } from "./ReferralCapture";

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isAdmin = path.startsWith("/admin");
  return (
    <div className={`relative min-h-screen overflow-x-hidden ${isAdmin ? "" : "pb-28 md:pb-8"}`}>
      {!isAdmin && <ParticleField />}
      {!isAdmin && <div className="vignette" />}
      {!isAdmin && (
        <Suspense fallback={null}>
          <ReferralCapture />
        </Suspense>
      )}
      <div className="relative z-10">
        {!isAdmin && <Nav />}
        {children}
      </div>
      <LiveRunner />
      <SeatRunner />
      {!isAdmin && <BottomNav />}
    </div>
  );
}
