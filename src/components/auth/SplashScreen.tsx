"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useLang } from "@/lib/i18n";

interface SplashScreenProps {
  onFinish: () => void;
  duration?: number;
}

export function SplashScreen({ onFinish, duration = 2400 }: SplashScreenProps) {
  const { t } = useLang();
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      const exitTimer = setTimeout(onFinish, 450);
      return () => clearTimeout(exitTimer);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onFinish]);

  const handleSkip = () => {
    setExiting(true);
    setTimeout(onFinish, 300);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: exiting ? 0 : 1, scale: exiting ? 1.05 : 1 }}
      exit={{ opacity: 0, scale: 1.06 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between overflow-hidden bg-[#06111f] px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] select-none text-white transform-gpu will-change-transform"
    >
      {/* ── Ambient Tricolor Glows (Saffron Top, Emerald Bottom, Gold Center) ── */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-saffron-500/25 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-500/25 blur-[100px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/15 blur-[120px]" />

      {/* ── Top Bar: Skip button ── */}
      <div className="relative z-10 flex w-full max-w-sm items-center justify-end">
        <button
          type="button"
          onClick={handleSkip}
          className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1 text-[11px] font-bold tracking-wider uppercase text-white/70 backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/10 hover:text-white active:scale-95"
        >
          {t("Skip", "தாண்டுக")} &rarr;
        </button>
      </div>

      {/* ── Center Content: Netaji Emblem & Patriotic Branding ── */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Glowing Pulsing Rings */}
        <div className="relative flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: [1, 1.4, 1.8],
              opacity: [0.7, 0.25, 0],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeOut",
            }}
            className="absolute size-32 rounded-full border border-saffron-400/40 bg-saffron-500/10 sm:size-36"
          />
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: [1, 1.25, 1.5],
              opacity: [0.8, 0.35, 0],
            }}
            transition={{
              duration: 2.2,
              delay: 0.3,
              repeat: Infinity,
              ease: "easeOut",
            }}
            className="absolute size-32 rounded-full border border-amber-300/50 bg-amber-400/10 sm:size-36"
          />

          {/* High-definition Netaji Emblem */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{
              duration: 0.8,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative size-28 overflow-hidden rounded-full border-2 border-amber-300/80 p-1 shadow-[0_0_50px_rgba(245,158,11,0.45)] sm:size-32"
          >
            <div className="size-full overflow-hidden rounded-full bg-navy-950">
              <img
                src="/nbm-logo.png"
                alt="Nethaji Boys Mandram"
                className="size-full object-cover object-center"
              />
            </div>
          </motion.div>
        </div>

        {/* Brand Titles with Staggered Entrance */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6"
        >
          <p className="text-[14px] font-black tracking-[0.28em] text-white/90 sm:text-[15px]">
            NETHAJI BOYS
          </p>
          <p className="mt-1 bg-gradient-to-r from-amber-300 via-saffron-400 to-amber-500 bg-clip-text text-[26px] font-black tracking-[0.22em] text-transparent drop-shadow-[0_2px_12px_rgba(245,158,11,0.3)] sm:text-[30px]">
            MANDRAM
          </p>
          <p className="mt-1.5 text-[14px] font-bold text-sky-200/90 sm:text-[15px]">
            நேதாஜி பாய்ஸ் மன்றம்
          </p>
        </motion.div>

        {/* Patriotic Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1 text-[11px] font-semibold text-white/80 backdrop-blur-sm"
        >
          <Sparkles className="size-3 text-amber-400" />
          <span>{t("Unity · Strength · Service", "ஒற்றுமை · பலம் · சேவை")}</span>
        </motion.div>
      </div>

      {/* ── Bottom: Sleek Animated Tricolor Beam ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="relative z-10 flex w-full max-w-xs flex-col items-center gap-2"
      >
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{
              repeat: Infinity,
              duration: 1.3,
              ease: "easeInOut",
            }}
            className="h-full w-2/3 rounded-full bg-gradient-to-r from-saffron-500 via-white to-emerald-500 shadow-[0_0_12px_rgba(255,255,255,0.6)]"
          />
        </div>
        <p className="text-[10.5px] font-semibold tracking-wider text-white/50">
          {t("Starting app…", "துவங்குகிறது…")}
        </p>
      </motion.div>
    </motion.div>
  );
}
