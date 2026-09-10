"use client";

import { Suspense, useEffect, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Eye, EyeOff, Lock, ShieldCheck, UserRound,
} from "lucide-react";
import { api } from "@/lib/client/api";
import { useLang } from "@/lib/i18n";
import { LogoMark } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import type { SessionUser } from "@/components/layout/session";


export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#0b192c]">
          <LogoMark className="size-12 animate-pulse" />
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}

/* ── Hero art: Netaji poster background ──────────────────── */

function HeroArt() {
  return (
    <div className="absolute inset-0">
      <img
        src="/netaji-poster.png"
        alt=""
        aria-hidden
        className="absolute inset-0 size-full object-cover object-top"
      />
    </div>
  );
}

/* ── Dark hero input ─────────────────────────────────────── */

function HeroInput({
  icon,
  className = "",
  ...rest
}: { icon?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      {icon ? (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-300/60">
          {icon}
        </span>
      ) : null}
      <input
        {...rest}
        className={`h-11 w-full rounded-xl border border-sky-300/20 bg-white/[0.06] text-[15px] text-white outline-none transition-all duration-150 placeholder:text-slate-400/60 focus:border-sky-300/60 focus:bg-white/[0.09] focus:ring-2 focus:ring-sky-400/25 disabled:opacity-55 ${
          icon ? "pl-10" : "pl-4"
        } pr-4 ${className}`}
      />
    </div>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { t: tr } = useLang();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [forgotHint, setForgotHint] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(0);
  const [reg, setReg] = useState({ name: "", phone: "", email: "", password: "" });
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");
  const [regDone, setRegDone] = useState(false);

  // Auto-redirect if already signed in in localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("nbm_user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u && u.id) {
          const next = params.get("next");
          const destination = next && next.startsWith("/") ? next : "/";
          router.replace(destination);
        }
      }
    } catch {
      /* ignore */
    }
  }, [params, router]);

  // "Remember me" — prefill the identifier from a previous session
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nbm.remember");
      if (saved) {
        setIdentifier(saved);
        setRemember(true);
      }
    } catch {
      /* storage unavailable */
    }
  }, []);

  const fail = (msg: string) => {
    setError(msg);
    setShake((s) => s + 1);
  };

  const afterAuth = (user: SessionUser) => {
    const next = params.get("next");
    try {
      localStorage.setItem("nbm_user", JSON.stringify(user));
      if (remember) localStorage.setItem("nbm.remember", identifier);
      else localStorage.removeItem("nbm.remember");
    } catch {
      /* storage unavailable */
    }
    console.info(`[demo] signed in as ${user.name} (${user.role})`);
    const destination = next && next.startsWith("/") ? next : "/";
    window.location.href = destination;
  };

  const login = async (identifierArg: string, passwordArg: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post<{ user: SessionUser }>("/api/auth/login", {
        identifier: identifierArg,
        password: passwordArg,
      });
      afterAuth(res.user);
    } catch (e) {
      fail((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const submitPassword = (e: FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return fail(tr("Enter phone/email and password", "தொலைபேசி/மின்னஞ்சல் மற்றும் கடவுச்சொல்லை உள்ளிடவும்"));
    void login(identifier, password);
  };

  const register = async (e: FormEvent) => {
    e.preventDefault();
    setRegError("");
    setRegDone(false);
    if (!reg.name.trim() || !reg.phone.trim() || !reg.email.trim() || !reg.password) {
      setRegError(tr("Fill in all the fields", "அனைத்து புலங்களையும் நிரப்பவும்"));
      return;
    }
    setRegLoading(true);
    try {
      const res = await api.post<{ user?: SessionUser; needsConfirmation?: boolean; email?: string }>(
        "/api/auth/register",
        reg,
      );
      if (res.needsConfirmation) {
        setRegDone(true);
      } else if (res.user) {
        afterAuth(res.user);
      }
    } catch (err) {
      setRegError((err as Error).message);
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#0b192c] text-white">
      {/* ── hero ── */}
      <div className="relative h-[300px] overflow-hidden sm:h-[330px]">
        <HeroArt />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#0b192c]" />
      </div>

      {/* ── content ── */}
      <div className="relative -mt-9 px-5 pb-12">
        <div className="mx-auto w-full max-w-[400px]">
          {/* title */}
          <div className="mb-6 text-center">
            <p className="text-[21px] font-black leading-none tracking-[0.02em] text-white">
              NETHAJI&nbsp;BOYS
            </p>
            <p className="mt-1 text-[27px] font-black leading-none tracking-[0.14em] text-amber-400">
              MANDRAM
            </p>
            <p className="mt-2 text-[14px] font-semibold text-white/90">நேதாஜி பாய்ஸ் மன்றம்</p>
            <p className="mt-1.5 text-[11.5px] font-medium leading-relaxed text-sky-300/90">
              {tr("Stronger Community", "வலுவான சமூகம்")}
              <br />
              {tr("Brighter Tomorrow", "பிரகாசமான நாளை")}
            </p>
          </div>

          {/* ── card ── */}
          <motion.div
            key={shake}
            initial={shake ? { x: [0, -10, 10, -6, 6, 0] } : false}
            animate={{ x: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-3xl border border-sky-300/15 bg-[#11213a]/85 p-6 shadow-[0_24px_60px_-20px_rgba(2,8,20,0.9)] backdrop-blur-md sm:p-7"
          >
            {mode === "login" ? (
              <form onSubmit={submitPassword} className="space-y-4">
                <HeroInput
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={tr("Phone number / Email", "தொலைபேசி எண் / மின்னஞ்சல்")}
                  icon={<UserRound className="size-4" />}
                  autoComplete="username"
                  inputMode="email"
                  aria-label={tr("Phone number or email", "தொலைபேசி எண் அல்லது மின்னஞ்சல்")}
                />
                <div className="relative">
                  <HeroInput
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={tr("Password", "கடவுச்சொல்")}
                    icon={<Lock className="size-4" />}
                    autoComplete="current-password"
                    aria-label={tr("Password", "கடவுச்சொல்")}
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? tr("Hide password", "கடவுச்சொல்லை மறை") : tr("Show password", "கடவுச்சொல்லை காட்டு")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400/80 transition-colors hover:text-white"
                  >
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex cursor-pointer select-none items-center gap-2 text-[12.5px] font-medium text-sky-200/90">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="size-4 rounded border-sky-300/30 bg-white/10 accent-sky-400"
                    />
                    {tr("Remember me", "என்னை நினைவில் கொள்")}
                  </label>
                  <button
                    type="button"
                    onClick={() => setForgotHint((s) => !s)}
                    className="text-[12.5px] font-semibold text-sky-300/90 transition-colors hover:text-white"
                  >
                    {tr("Forgot?", "மறந்துவிட்டீர்களா?")}
                  </button>
                </div>
                {forgotHint ? (
                  <p className="rounded-lg border border-sky-300/20 bg-sky-400/10 px-3 py-2 text-[11.5px] font-medium text-sky-200/90">
                    {tr("Ask the Mandram admin to reset your password.", "மன்ற நிர்வாகியிடம் கடவுச்சொல்லை மீட்டமைக்கச் சொல்லுங்கள்.")}
                  </p>
                ) : null}

                {error ? (
                  <p className="rounded-lg bg-red-500/15 px-3 py-2 text-[12.5px] font-medium text-red-300">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 text-[15px] font-extrabold tracking-wide text-amber-950 shadow-[0_12px_28px_-10px_rgba(245,158,11,0.55)] transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
                >
                  {loading ? (
                    <span className="size-4 animate-spin rounded-full border-2 border-amber-900/30 border-t-amber-900" />
                  ) : (
                    <Lock className="size-4" />
                  )}
                  {tr("Login", "உள்நுழைக")}
                </button>
              </form>
            ) : (
              <form onSubmit={register} className="space-y-4">
                <HeroInput
                  value={reg.name}
                  onChange={(e) => setReg((r) => ({ ...r, name: e.target.value }))}
                  placeholder={tr("Full name", "முழுப் பெயர்")}
                  icon={<UserRound className="size-4" />}
                  autoComplete="name"
                  aria-label={tr("Full name", "முழுப் பெயர்")}
                />
                <HeroInput
                  value={reg.phone}
                  onChange={(e) => setReg((r) => ({ ...r, phone: e.target.value }))}
                  placeholder={tr("Phone number", "தொலைபேசி எண்")}
                  icon={<UserRound className="size-4" />}
                  autoComplete="tel"
                  inputMode="tel"
                  aria-label={tr("Phone number", "தொலைபேசி எண்")}
                />
                <HeroInput
                  type="email"
                  value={reg.email}
                  onChange={(e) => setReg((r) => ({ ...r, email: e.target.value }))}
                  placeholder={tr("Email", "மின்னஞ்சல்")}
                  icon={<UserRound className="size-4" />}
                  autoComplete="email"
                  inputMode="email"
                  aria-label={tr("Email", "மின்னஞ்சல்")}
                />
                <div className="relative">
                  <HeroInput
                    type={showPw ? "text" : "password"}
                    value={reg.password}
                    onChange={(e) => setReg((r) => ({ ...r, password: e.target.value }))}
                    placeholder={tr("Create a password (min 6 characters)", "கடவுச்சொல்லை உருவாக்கவும் (குறைந்தது 6 எழுத்துகள்)")}
                    icon={<Lock className="size-4" />}
                    autoComplete="new-password"
                    aria-label={tr("Create a password", "கடவுச்சொல்லை உருவாக்கவும்")}
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? tr("Hide password", "கடவுச்சொல்லை மறை") : tr("Show password", "கடவுச்சொல்லை காட்டு")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400/80 transition-colors hover:text-white"
                  >
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

                {regError ? (
                  <p className="rounded-lg bg-red-500/15 px-3 py-2 text-[12.5px] font-medium text-red-300">
                    {regError}
                  </p>
                ) : null}
                {regDone ? (
                  <p className="rounded-lg border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-[12.5px] font-medium text-emerald-200">
                    {tr(
                      "Account created! Check your email to confirm, then log in.",
                      "கணக்கு உருவாக்கப்பட்டது! உறுதிப்படுத்த மின்னஞ்சலைப் பார்க்கவும், பிறகு உள்நுழையவும்.",
                    )}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={regLoading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 text-[15px] font-extrabold tracking-wide text-amber-950 shadow-[0_12px_28px_-10px_rgba(245,158,11,0.55)] transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
                >
                  {regLoading ? (
                    <span className="size-4 animate-spin rounded-full border-2 border-amber-900/30 border-t-amber-900" />
                  ) : (
                    <UserRound className="size-4" />
                  )}
                  {tr("Create account", "கணக்கை உருவாக்கு")}
                </button>
              </form>
            )}

            <div className="mt-5 text-center">
              {mode === "login" ? (
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className="text-[13px] font-semibold text-sky-300/90 transition-colors hover:text-white"
                >
                  {tr("New here? Create an account", "புதியவரா? கணக்கை உருவாக்கவும்")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setRegError("");
                    setRegDone(false);
                  }}
                  className="text-[13px] font-semibold text-sky-300/90 transition-colors hover:text-white"
                >
                  {tr("Already have an account? Log in", "ஏற்கனவே கணக்கு உள்ளதா? உள்நுழைக")}
                </button>
              )}
            </div>
          </motion.div>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400/80">
            <ShieldCheck className="size-3.5 text-emerald-400" />
            {tr("Secure sign-in · Nethaji Boys Mandram", "பாதுகாப்பான உள்நுழைவு · நேதாஜி பாய்ஸ் மன்றம்")}
          </p>
        </div>
      </div>
    </div>
  );
}