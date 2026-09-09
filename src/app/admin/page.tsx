"use client";

import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminProvider, useAdmin } from "@/components/admin/AdminProvider";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSection } from "@/components/admin/sections";

export default function AdminPage() {
  return (
    <AdminProvider>
      <AdminGate />
    </AdminProvider>
  );
}

function AdminGate() {
  const { data } = useAdmin();
  if (!data) return <AdminLogin />;
  return (
    <AdminShell>
      <AdminSection />
    </AdminShell>
  );
}
