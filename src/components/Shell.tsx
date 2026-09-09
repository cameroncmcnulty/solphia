"use client";

import { usePathname } from "next/navigation";
import { Nav } from "./Nav";
import { ParticleField } from "./ParticleField";
import { BottomNav } from "./BottomNav";
import { LiveRunner } from "./LiveRunner";
import { SeatRunner } from "./SeatRunner";

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isAdmin = path.startsWith("/admin");
  return (
    <div className={`relative min-h-screen overflow-x-hidden ${isAdmin ? "" : "pb-28 md:pb-8"}`}>
      {!isAdmin && <ParticleField />}
      {!isAdmin && <div className="vignette" />}
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
