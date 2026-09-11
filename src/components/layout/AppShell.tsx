"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogoMark } from "@/components/ui/Logo";
import { prefetchCoreRoutes } from "@/lib/client/hooks";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { BottomNav } from "./BottomNav";
import { MoreSheet } from "./MoreSheet";
import { SearchCommand } from "./SearchCommand";
import { useSession, type SessionUser } from "./session";

export function AppShell({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser?: SessionUser | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useSession();
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // Warm up primary app navigation routes in background
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        prefetchCoreRoutes();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // ⌘K / Ctrl+K opens search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [user, router]);

  if (!user) {
    return <div className="min-h-dvh bg-[#0b192c]" />;
  }

  return (
    <div className="flex min-h-dvh max-w-full overflow-x-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 max-w-full flex-col overflow-x-hidden">
        <Topbar onOpenSearch={() => setSearchOpen(true)} />
        <main className="w-full min-w-0 max-w-full flex-1 overflow-x-hidden">
          <div className="mx-auto w-full min-w-0 max-w-[1200px] px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-7">
            <motion.div
              key={pathname}
              initial={{ opacity: 0.85 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.1, ease: "easeOut" }}
              className="w-full min-w-0 max-w-full"
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>
      <BottomNav onOpenMore={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
      <SearchCommand open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
