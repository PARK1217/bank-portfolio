"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { useAdminAuth } from "@/lib/auth";

export default function RootPage() {
  const router = useRouter();
  const { admin, loading } = useAdminAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(admin ? "/dashboard" : "/login");
  }, [admin, loading, router]);

  return (
    <main className="flex h-screen items-center justify-center">
      <Spinner label="이동 중…" />
    </main>
  );
}