"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { saveRef } from "@/components/ReferralCapture";

export default function RefCatch() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  useEffect(() => {
    if (code) saveRef(String(code));
    router.replace("/launch");
  }, [code, router]);
  return (
    <main className="mx-auto max-w-md px-5 py-24 text-center">
      <p className="font-mono text-sm text-mute">Saving invite…</p>
    </main>
  );
}
