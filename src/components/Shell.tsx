"use client";

import { Nav } from "./Nav";
import { ParticleField } from "./ParticleField";
import { BottomNav } from "./BottomNav";
import { LiveRunner } from "./LiveRunner";
import { SeatRunner } from "./SeatRunner";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden pb-28 md:pb-8">
      <ParticleField />
      <div className="vignette" />
      <div className="relative z-10">
        <Nav />
        {children}
      </div>
      <LiveRunner />
      <SeatRunner />
      <BottomNav />
    </div>
  );
}
