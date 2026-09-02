"use client";

import { Nav } from "./Nav";
import { ParticleField } from "./ParticleField";
import { ChatDock } from "./ChatDock";
import { BottomNav } from "./BottomNav";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden pb-20 md:pb-0">
      <ParticleField />
      <div className="vignette" />
      <div className="relative z-10">
        <Nav />
        {children}
      </div>
      <ChatDock />
      <BottomNav />
    </div>
  );
}
