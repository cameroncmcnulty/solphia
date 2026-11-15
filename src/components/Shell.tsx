"use client";

import { Suspense, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Nav } from "./Nav";
import { ParticleField } from "./ParticleField";
import { BottomNav } from "./BottomNav";
import { LiveRunner } from "./LiveRunner";
import { SeatRunner } from "./SeatRunner";
import { ReferralCapture } from "./ReferralCapture";
import { WalletKeepalive } from "./WalletConnect";
import { WalletHost } from "./wallet/WalletHost";
import { TosGate } from "./TosGate";
import { SiteFooter } from "./SiteFooter";
import { NoticeHost } from "./NoticeHost";
import { clearScrollLock, lockPageScroll } from "@/lib/scrollLock";
import { isReservedV3Host, v3HostFromHeader } from "@/lib/tools/v3/host";

function hostIsMeme(memeHost: boolean): boolean {
  if (memeHost) return true;
  if (typeof window === "undefined") return false;
  const sub = v3HostFromHeader(window.location.host);
  return Boolean(sub && !isReservedV3Host(sub) && !sub.includes("."));
}

export function Shell({ children, memeHost = false }: { children: React.ReactNode; memeHost?: boolean }) {
  const path = usePathname();
  const isAdmin = path.startsWith("/admin");
  const isMeme = hostIsMeme(memeHost) || path === "/m" || path.startsWith("/m/");
  const isShill = path === "/shill" || path.startsWith("/shill/");
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
      <WalletHost />
      <LiveRunner />
      <SeatRunner />
      <NoticeHost />
    </>
  );

  if (isMeme) {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        {children}
        <NoticeHost />
      </div>
    );
  }

  if (isShill) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-void">
        <Suspense fallback={null}>
          <ReferralCapture />
        </Suspense>
        {children}
        {runners}
        <BottomNav />
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen overflow-x-hidden ${isAdmin ? "" : "has-tabbar"}`}>
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
      {!isAdmin && <BottomNav />}
    </div>
  );
}
