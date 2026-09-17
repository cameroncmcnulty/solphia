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

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isAdmin = path.startsWith("/admin");
  const isShill = path === "/shill" || path.startsWith("/shill/");

  useEffect(() => {
    if (!isShill) return;
    const html = document.documentElement;
    const body = document.body;
    const prevH = html.style.overflow;
    const prevB = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevH;
      body.style.overflow = prevB;
    };
  }, [isShill]);

  return (
    <div className={`relative overflow-x-hidden ${isAdmin || isShill ? "h-dvh overflow-hidden" : "min-h-screen pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-8"}`}>
      {!isAdmin && !isShill && <ParticleField />}
      {!isAdmin && !isShill && <div className="vignette" />}
      {!isAdmin && (
        <Suspense fallback={null}>
          <ReferralCapture />
        </Suspense>
      )}
      <div className={`relative z-10 ${isShill ? "h-full" : ""}`}>
        {!isAdmin && !isShill && <Nav />}
        {children}
      </div>
      {!isShill && <SiteFooter />}
      <TosGate />
      <WalletKeepalive />
      <LiveRunner />
      <SeatRunner />
      {!isAdmin && !isShill && <HumanGate />}
      {!isAdmin && !isShill && <BottomNav />}
    </div>
  );
}
