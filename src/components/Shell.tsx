"use client";

import { Suspense, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Nav } from "./Nav";
import { ParticleField } from "./ParticleField";
import { BottomNav } from "./BottomNav";
import { LiveRunner } from "./LiveRunner";
import { SeatRunner } from "./SeatRunner";
import { ReferralCapture } from "./ReferralCapture";
import { HumanGate } from "./HumanGate";
import { WalletKeepalive } from "./WalletConnect";
import { TosGate } from "./TosGate";
import { SiteFooter } from "./SiteFooter";
import { clearScrollLock, lockPageScroll } from "@/lib/scrollLock";

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isAdmin = path.startsWith("/admin");
  const isShill = path === "/shill" || path.startsWith("/shill/");
  const skipHuman = isAdmin || path === "/launch" || path === "/swap" || path.startsWith("/launch/");

  useEffect(() => {
    if (isShill) {
      lockPageScroll();
      window.scrollTo(0, 0);
      return () => clearScrollLock();
    }
    clearScrollLock();
  }, [isShill]);

  const runners = (
    <>
      <TosGate />
      <WalletKeepalive />
      <LiveRunner />
      <SeatRunner />
    </>
  );

  if (isShill) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-void">
        <Suspense fallback={null}>
          <ReferralCapture />
        </Suspense>
        {children}
        {runners}
        {!skipHuman && <HumanGate />}
        <BottomNav />
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen overflow-x-hidden ${isAdmin ? "" : "pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-8"}`}>
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
      <SiteFooter />
      {runners}
      {!skipHuman && <HumanGate />}
      {!isAdmin && <BottomNav />}
    </div>
  );
}
