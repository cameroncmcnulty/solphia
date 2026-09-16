"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Nav } from "./Nav";
import { ParticleField } from "./ParticleField";
import { BottomNav } from "./BottomNav";
import { LiveRunner } from "./LiveRunner";
import { SeatRunner } from "./SeatRunner";
import { ReferralCapture } from "./ReferralCapture";
import { HumanGate } from "./HumanGate";
import { WalletKeepalive } from "./WalletConnect";

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isAdmin = path.startsWith("/admin");
  const isShill = path === "/shill" || path.startsWith("/shill/");
  return (
    <div className={`relative min-h-screen overflow-x-hidden ${isAdmin || isShill ? "" : "pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-8"}`}>
      {!isAdmin && !isShill && <ParticleField />}
      {!isAdmin && !isShill && <div className="vignette" />}
      {!isAdmin && (
        <Suspense fallback={null}>
          <ReferralCapture />
        </Suspense>
      )}
      <div className="relative z-10">
        {!isAdmin && <div className={isShill ? "hidden md:block" : ""}><Nav /></div>}
        {children}
      </div>
      <WalletKeepalive />
      <LiveRunner />
      <SeatRunner />
      {!isAdmin && <HumanGate />}
      {!isAdmin && <BottomNav />}
    </div>
  );
}
