"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AdminDesk } from "@/lib/admin/types";
import { isAdminSection, type AdminSectionId } from "@/lib/admin/nav";
import { useOwner } from "@/lib/hooks";
import { mergeDesk } from "./ui";

type AdminContextValue = {
  data: AdminDesk | null;
  authed: boolean;
  busy: boolean;
  err: string;
  note: string;
  noteErr: boolean;
  secret: string;
  setSecret: (v: string) => void;
  now: number;
  streamOn: boolean;
  section: AdminSectionId;
  go: (id: AdminSectionId) => void;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
  patch: (body: Record<string, unknown>) => Promise<{ ok: boolean; error?: string; message?: string }>;
  adminPk: string;
  setAdminPk: (v: string) => void;
  treasuryPk: string;
  setTreasuryPk: (v: string) => void;
  ownerPk: string;
  setOwnerPk: (v: string) => void;
  sphaX: string;
  setSphaX: (v: string) => void;
  sphaTg: string;
  setSphaTg: (v: string) => void;
  sphaDc: string;
  setSphaDc: (v: string) => void;
  hint: string;
  setHint: (v: string) => void;
  copied: string;
  setCopied: (v: string) => void;
  saved: string;
  setSaved: (v: string) => void;
  pnlWin: "h24" | "d7" | "d30";
  setPnlWin: (v: "h24" | "d7" | "d30") => void;
  btLev: 1 | 2 | 3;
  setBtLev: (v: 1 | 2 | 3) => void;
  owner: string | null;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside AdminProvider");
  return ctx;
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [secret, setSecret] = useState("");
  const [data, setData] = useState<AdminDesk | null>(null);
  const [authed, setAuthed] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [streamOn, setStreamOn] = useState(false);
  const [note, setNote] = useState("");
  const [noteErr, setNoteErr] = useState(false);
  const [adminPk, setAdminPk] = useState("");
  const [treasuryPk, setTreasuryPk] = useState("");
  const [ownerPk, setOwnerPk] = useState("");
  const [sphaX, setSphaX] = useState("");
  const [sphaTg, setSphaTg] = useState("");
  const [sphaDc, setSphaDc] = useState("");
  const [copied, setCopied] = useState("");
  const [saved, setSaved] = useState("");
  const [hint, setHint] = useState("");
  const [pnlWin, setPnlWin] = useState<"h24" | "d7" | "d30">("h24");
  const [btLev, setBtLev] = useState<1 | 2 | 3>(1);
  const [section, setSection] = useState<AdminSectionId>("overview");
  const owner = useOwner();

  const applyHash = useCallback(() => {
    if (typeof window === "undefined") return;
    const h = window.location.hash.replace(/^#/, "");
    setSection(isAdminSection(h) ? h : "overview");
  }, []);

  useEffect(() => {
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [applyHash]);

  const go = useCallback((id: AdminSectionId) => {
    setSection(id);
    if (typeof window === "undefined") return;
    const next = `#${id}`;
    if (window.location.hash !== next) window.location.hash = id;
  }, []);

  const hydrate = useCallback((next: AdminDesk) => {
    setData((prev) => mergeDesk(prev, next));
    setTreasuryPk(next.treasury || "");
    setOwnerPk(next.ownerWallet || "");
    setSphaX(next.sphaSocials?.x || "");
    setSphaTg(next.sphaSocials?.telegram || "");
    setSphaDc(next.sphaSocials?.discord || "");
  }, []);

  const reload = useCallback(async () => {
    const dash = await fetch("/api/admin");
    if (!dash.ok) {
      setAuthed(false);
      setData(null);
      throw new Error("denied");
    }
    const next = (await dash.json()) as AdminDesk;
    hydrate(next);
  }, [hydrate]);

  const login = useCallback(async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      if (!r.ok) {
        setErr("Wrong password.");
        return;
      }
      await reload();
      setAuthed(true);
    } catch {
      setErr("Login failed.");
    } finally {
      setBusy(false);
    }
  }, [reload, secret]);

  const logout = useCallback(async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAuthed(false);
    setData(null);
    setSecret("");
  }, []);

  const patch = useCallback(async (body: Record<string, unknown>) => {
    setBusy(true);
    setNote("");
    setNoteErr(false);
    try {
      const r = await fetch("/api/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) {
        const error = typeof j.error === "string" ? j.error : "failed";
        const message = typeof j.message === "string" ? j.message : error;
        setNote(message);
        setNoteErr(true);
        if (j.desk) setData(j.desk);
        return { ok: false, error, message };
      }
      if (j.desk) setData(j.desk as AdminDesk);
      if (j.note) setNote(j.note);
      else if (j.made != null) setNote(j.made ? `Made ${j.made} new post${j.made === 1 ? "" : "s"}.` : "Pack already ran today.");
      setNoteErr(false);
      return { ok: true };
    } catch {
      setNote("Save failed.");
      setNoteErr(true);
      return { ok: false, error: "failed", message: "Save failed." };
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    let live = false;
    const es = new EventSource("/api/admin/stream");
    es.onmessage = (e) => {
      try {
        const next = JSON.parse(e.data) as AdminDesk;
        setData((prev) => mergeDesk(prev, next));
        live = true;
        setStreamOn(true);
      } catch {
        /* ignore */
      }
    };
    es.onerror = () => {
      live = false;
      setStreamOn(false);
    };
    const poll = setInterval(() => {
      if (live) return;
      reload().catch(() => setAuthed(false));
    }, 5000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
      es.close();
    };
  }, [authed, reload]);

  useEffect(() => {
    if (owner && !adminPk) setAdminPk(owner);
  }, [owner, adminPk]);

  const value = useMemo<AdminContextValue>(
    () => ({
      data,
      authed,
      busy,
      err,
      note,
      noteErr,
      secret,
      setSecret,
      now,
      streamOn,
      section,
      go,
      login,
      logout,
      reload,
      patch,
      adminPk,
      setAdminPk,
      treasuryPk,
      setTreasuryPk,
      ownerPk,
      setOwnerPk,
      sphaX,
      setSphaX,
      sphaTg,
      setSphaTg,
      sphaDc,
      setSphaDc,
      hint,
      setHint,
      copied,
      setCopied,
      saved,
      setSaved,
      pnlWin,
      setPnlWin,
      btLev,
      setBtLev,
      owner,
    }),
    [
      data,
      authed,
      busy,
      err,
      note,
      noteErr,
      secret,
      now,
      streamOn,
      section,
      go,
      login,
      logout,
      reload,
      patch,
      adminPk,
      treasuryPk,
      ownerPk,
      sphaX,
      sphaTg,
      sphaDc,
      hint,
      copied,
      saved,
      pnlWin,
      btLev,
      owner,
    ],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
