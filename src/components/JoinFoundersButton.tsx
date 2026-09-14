"use client";

import { useRouter } from "next/navigation";
import { Gift } from "lucide-react";

export function JoinFoundersButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push("/circle?welcome=1")}
      className={`btn-acid inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full px-7 text-base ${className}`}
    >
      <Gift className="h-5 w-5" />
      Join Founders Circle
    </button>
  );
}
