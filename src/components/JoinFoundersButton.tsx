"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gift } from "lucide-react";
import { TealConfetti } from "./TealConfetti";

export function JoinFoundersButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [fire, setFire] = useState(false);
  return (
    <>
      <TealConfetti fire={fire} />
      <button
        type="button"
        onClick={() => {
          setFire(false);
          requestAnimationFrame(() => setFire(true));
          window.setTimeout(() => router.push("/circle?welcome=1"), 420);
        }}
        className={`btn-acid inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full px-7 text-base ${className}`}
      >
        <Gift className="h-5 w-5" />
        Join Founders Circle
      </button>
    </>
  );
}
