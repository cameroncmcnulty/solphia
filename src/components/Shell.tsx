"use client";

import { Cursor } from "./Cursor";
import { Nav } from "./Nav";
import { ParticleField } from "./ParticleField";
import { ChatDock } from "./ChatDock";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <ParticleField />
      <div className="scanlines" />
      <div className="vignette" />
      <div className="grain" />
      <Cursor />
      <div className="relative z-10">
        <Nav />
        {children}
      </div>
      <ChatDock />
    </div>
  );
}
