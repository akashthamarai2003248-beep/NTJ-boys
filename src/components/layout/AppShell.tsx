"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogoMark } from "@/components/ui/Logo";
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

  // Only redirect after session restoration has completely finished
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // Short auth-loading/splash state only while checking the session
  if (loading || !user) {
    return (
      <div className="fixed inset-0 z-50 flex min-h-dvh flex-col items-center justify-center bg-[#06111f] text-white">
        <div className="relative flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className="absolute size-24 animate-ping rounded-full border border-amber-400/30 bg-amber-500/10 duration-1000" />
            <div className="relative size-20 overflow-hidden rounded-full border-2 border-amber-400/80 p-1 shadow-[0_0_35px_rgba(245,158,11,0.35)]">
              <img
                src="/nbm-logo.png"
                alt="Nethaji Boys Mandram"
                className="size-full object-cover object-center"
              />
            </div>
          </div>
          <div className="flex flex-col items-center text-center">
            <p className="text-[13px] font-black tracking-[0.22em] text-white/90">NETHAJI BOYS</p>
            <p className="text-[18px] font-black tracking-[0.18em] text-amber-400">MANDRAM</p>
          </div>
          <div className="relative mt-2 h-1 w-28 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 animate-[pulse_1.2s_infinite] rounded-full bg-gradient-to-r from-amber-400 to-amber-500" />
          </div>
        </div>
      </div>
    );
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
