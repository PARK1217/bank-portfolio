"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { useAdminAuth } from "@/lib/auth";

export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { admin, loading } = useAdminAuth();

  useEffect(() => {
    if (!loading && !admin) router.replace("/login");
  }, [admin, loading, router]);

  if (loading || !admin) {
    return (
      <main className="flex h-screen items-center justify-center">
        <Spinner label="권한 확인 중…" />
      </main>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="mx-auto max-w-6xl px-6 py-6 animate-fade-in">{children}</div>
      </div>
    </div>
  );
}