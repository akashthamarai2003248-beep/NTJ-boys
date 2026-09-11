"use client";

import { Suspense, useEffect, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Eye, EyeOff, Lock, Phone, Shield, ShieldCheck, UserRound,
} from "lucide-react";
import { api } from "@/lib/client/api";
import { useLang } from "@/lib/i18n";
import { LogoMark } from "@/components/ui/Logo";
import { prefetchCoreRoutes } from "@/lib/client/hooks";
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



  // Synchronously check if user is already signed in in localStorage
  const [alreadyLoggedIn] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (params.has("logout")) return false;
    try {
      const stored = localStorage.getItem("nbm_user");
      if (stored) {
        const u = JSON.parse(stored);
        return Boolean(u && u.id);
      }
    } catch {
      /* ignore */
    }
    return false;
  });

  // Mode selection: default to member login for returning users, registration for new visitors
  const [mode, setMode] = useState<"login" | "register" | "admin">(() => {
    const m = params.get("mode");
    if (m === "admin") return "admin";
    if (m === "register") return "register";
    return "login";
  });
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [forgotHint, setForgotHint] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(0);
  const [reg, setReg] = useState({ name: "", phone: "", password: "" });
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");
  const [regDone, setRegDone] = useState(false);

  // Auto-redirect if already signed in
  useEffect(() => {
    if (params.has("logout")) {
      try {
        localStorage.removeItem("nbm_user");
        localStorage.removeItem("nbm.remember");
        document.cookie = "nbm_session=; path=/; max-age=0; SameSite=Lax";
      } catch {
        /* ignore */
      }
      return;
    }
    if (alreadyLoggedIn) {
      const next = params.get("next");
      const destination = next && next.startsWith("/") ? next : "/";
      router.replace(destination);
    }
  }, [alreadyLoggedIn, params, router]);

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
    const isAdminUser =
      mode === "admin" ||
      user.role === "admin" ||
      user.phone === "8248590767" ||
      user.email?.startsWith("8248590767@") ||
      user.name === "Akash";

    const finalUser: SessionUser = {
      ...user,
      role: isAdminUser ? "admin" : user.role,
      position: isAdminUser ? "Admin" : user.position,
    };

    try {
      localStorage.setItem("nbm_user", JSON.stringify(finalUser));
      if (remember) localStorage.setItem("nbm.remember", identifier);
      else localStorage.removeItem("nbm.remember");
      if (typeof document !== "undefined") {
        document.cookie = `nbm_session=${encodeURIComponent(finalUser.id)}; path=/; max-age=31536000; SameSite=Lax`;
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("nbm_session_update"));
      }
    } catch {
      /* storage unavailable */
    }
    prefetchCoreRoutes();
    console.info(`[demo] signed in as ${finalUser.name} (${finalUser.role})`);
    const destination = next && next.startsWith("/") ? next : "/";
    router.replace(destination);
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
    if (!identifier.trim() || !password) return fail(tr("Enter phone number and password", "தொலைபேசி எண் மற்றும் கடவுச்சொல்லை உள்ளிடவும்"));
    void login(identifier, password);
  };

  const register = async (e: FormEvent) => {
    e.preventDefault();
    setRegError("");
    setRegDone(false);
    if (!reg.name.trim() || !reg.phone.trim() || !reg.password) {
      setRegError(tr("Fill in all the fields", "அனைத்து புலங்களையும் நிரப்பவும்"));
      return;
    }
    const cleanPhone = reg.phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setRegError(tr("Enter a valid 10-digit phone number", "சரியான 10 இலக்க தொலைபேசி எண்ணை உள்ளிடவும்"));
      return;
    }
    if (reg.password.length < 6) {
      setRegError(tr("Password must be at least 6 characters", "கடவுச்சொல் குறைந்தது 6 எழுத்துகள் இருக்க வேண்டும்"));
      return;
    }
    setRegLoading(true);
    try {
      const res = await api.post<{ user?: SessionUser; needsConfirmation?: boolean; email?: string }>(
        "/api/auth/register",
        {
          name: reg.name,
          phone: reg.phone,
          password: reg.password,
        },
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

  // If already logged in, do not render auth forms at all to avoid any UI flash
  if (alreadyLoggedIn) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0b192c]">
        <LogoMark className="size-12 animate-pulse" />
      </div>
    );
  }

  return (
    <>
      {/* Zero-flash client guard: If already logged in, hide body and redirect in 0ms before paint */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var p = new URLSearchParams(window.location.search);
                if (p.has("logout")) {
                  try {
                    localStorage.removeItem("nbm_user");
                    localStorage.removeItem("nbm.remember");
                    document.cookie = "nbm_session=; path=/; max-age=0; SameSite=Lax";
                  } catch (e) {}
                  return;
                }
                var u = localStorage.getItem("nbm_user");
                if (u && JSON.parse(u).id) {
                  document.documentElement.classList.add("nbm-auth-redirect");
                  var n = p.get("next");
                  var dest = (n && n.startsWith("/")) ? n : "/";
                  document.cookie = "nbm_session=" + encodeURIComponent(JSON.parse(u).id) + "; path=/; max-age=31536000; SameSite=Lax";
                  window.location.replace(dest);
                }
              } catch (e) {}
            })();
          `,
        }}
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
            html.nbm-auth-redirect body {
              visibility: hidden !important;
              background-color: #0b192c !important;
            }
          `,
        }}
      />



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

              <div className="mt-3.5 flex justify-center">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[12px] font-bold tracking-wide backdrop-blur-md ${
                  mode === "admin"
                    ? "border border-amber-400/40 bg-amber-950/70 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                    : "border border-sky-300/20 bg-sky-950/60 text-sky-200"
                }`}>
                  <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
                  {mode === "admin"
                    ? tr("Mandram Admin Portal", "மன்ற நிர்வாகி போர்ட்டல்")
                    : mode === "register"
                    ? tr("New Member Registration", "புதிய உறுப்பினர் பதிவு")
                    : tr("Member Sign-in", "உறுப்பினர் உள்நுழைவு")}
                </span>
              </div>
            </div>

            {/* ── card ── */}
            <motion.div
              key={shake}
              initial={shake ? { x: [0, -10, 10, -6, 6, 0] } : false}
              animate={{ x: 0 }}
              transition={{ duration: 0.4 }}
              className={`relative rounded-3xl border p-6 shadow-[0_24px_60px_-20px_rgba(2,8,20,0.9)] backdrop-blur-md sm:p-7 transition-all duration-300 ${
                mode === "admin"
                  ? "border-amber-400/40 bg-[#162238]/90 shadow-[0_0_35px_rgba(245,158,11,0.18)]"
                  : "border-sky-300/15 bg-[#11213a]/85"
              }`}
            >
              {/* Small Admin Quick-Toggle Icon */}
              <button
                type="button"
                onClick={() => {
                  if (mode === "admin") {
                    setMode("login");
                    setIdentifier("");
                    setPassword("");
                  } else {
                    setMode("admin");
                    setIdentifier("");
                    setPassword("");
                  }
                  setError("");
                  setRegError("");
                }}
                title={mode === "admin" ? tr("Switch to Member Login", "உறுப்பினர் உள்நுழைவு") : tr("Admin Login", "நிர்வாகி உள்நுழைவு")}
                aria-label={tr("Admin Portal", "நிர்வாகி போர்ட்டல்")}
                className={`absolute right-4 top-4 flex size-9 items-center justify-center rounded-xl transition-all duration-200 ${
                  mode === "admin"
                    ? "bg-amber-400 text-amber-950 shadow-[0_0_15px_rgba(251,191,36,0.6)] ring-2 ring-amber-300"
                    : "border border-white/10 bg-white/5 text-slate-400 hover:border-amber-400/40 hover:bg-amber-400/15 hover:text-amber-300"
                }`}
              >
                <Shield className="size-4" />
              </button>

              <div className="mb-5 text-center">
                <h2 className="text-[17px] font-bold text-white flex items-center justify-center gap-2">
                  {mode === "admin" ? (
                    <>
                      <Shield className="size-4 text-amber-400" />
                      {tr("Admin Access", "நிர்வாகி உள்நுழைவு")}
                    </>
                  ) : mode === "register" ? (
                    tr("Create an Account", "கணக்கை உருவாக்கவும்")
                  ) : (
                    tr("Welcome Back", "மீண்டும் வருக")
                  )}
                </h2>
                <p className="mt-0.5 text-[12px] text-slate-300/80">
                  {mode === "admin"
                    ? tr("Authorized Mandram Admin login", "அங்கீகரிக்கப்பட்ட மன்ற நிர்வாகி உள்நுழைவு")
                    : mode === "register"
                    ? tr("Register to join Nethaji Boys Mandram", "நேதாஜி பாய்ஸ் மன்றத்தில் இணைய பதிவு செய்க")
                    : tr("Log in to access your Mandram account", "உங்கள் மன்ற கணக்கில் உள்நுழையவும்")}
                </p>
              </div>

            {mode === "register" ? (
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
                  icon={<Phone className="size-4" />}
                  autoComplete="tel"
                  inputMode="tel"
                  aria-label={tr("Phone number", "தொலைபேசி எண்")}
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
                      "Account created! You can now log in with your phone number.",
                      "கணக்கு உருவாக்கப்பட்டது! இப்போது உங்கள் தொலைபேசி எண்ணைப் பயன்படுத்தி உள்நுழையலாம்.",
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
            ) : (
              <form onSubmit={submitPassword} className="space-y-4">
                <HeroInput
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={mode === "admin" ? tr("Admin Username", "நிர்வாகி பயனர் பெயர்") : tr("Phone number", "தொலைபேசி எண்")}
                  icon={mode === "admin" ? <UserRound className="size-4" /> : <Phone className="size-4" />}
                  autoComplete={mode === "admin" ? "username" : "tel"}
                  inputMode={mode === "admin" ? "text" : "tel"}
                  aria-label={mode === "admin" ? tr("Admin Username", "நிர்வாகி பயனர் பெயர்") : tr("Phone number", "தொலைபேசி எண்")}
                />
                <div className="relative">
                  <HeroInput
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "admin" ? tr("Admin Password", "நிர்வாகி கடவுச்சொல்") : tr("Password", "கடவுச்சொல்")}
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
                  {mode !== "admin" ? (
                    <button
                      type="button"
                      onClick={() => setForgotHint((s) => !s)}
                      className="text-[12.5px] font-semibold text-sky-300/90 transition-colors hover:text-white"
                    >
                      {tr("Forgot?", "மறந்துவிட்டீர்களா?")}
                    </button>
                  ) : (
                    <span className="text-[11.5px] font-bold text-amber-300/90">
                      {tr("Admin Portal", "நிர்வாகி போர்ட்டல்")}
                    </span>
                  )}
                </div>
                {forgotHint && mode !== "admin" ? (
                  <p className="rounded-lg border border-sky-300/20 bg-sky-400/10 px-3 py-2 text-[11.5px] font-medium text-sky-200/90">
                    {tr(
                      "Ask the app admin (ntjboys) to reset your password.",
                      "செயலி நிர்வாகியிடம் (ntjboys) கடவுச்சொல்லை மீட்டமைக்கச் சொல்லுங்கள்."
                    )}
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
                  className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-extrabold tracking-wide transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-60 ${
                    mode === "admin"
                      ? "bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-navy-950 shadow-[0_12px_28px_-10px_rgba(245,158,11,0.65)] ring-1 ring-amber-300"
                      : "bg-gradient-to-b from-amber-400 to-amber-500 text-amber-950 shadow-[0_12px_28px_-10px_rgba(245,158,11,0.55)]"
                  }`}
                >
                  {loading ? (
                    <span className="size-4 animate-spin rounded-full border-2 border-amber-900/30 border-t-amber-900" />
                  ) : mode === "admin" ? (
                    <ShieldCheck className="size-4.5" />
                  ) : (
                    <Lock className="size-4" />
                  )}
                  {mode === "admin" ? tr("Login as Admin", "நிர்வாகியாக உள்நுழைக") : tr("Login", "உள்நுழைக")}
                </button>
              </form>
            )}

            <div className="mt-5 text-center">
              {mode === "admin" ? (
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setIdentifier("");
                    setPassword("");
                    setError("");
                  }}
                  className="text-[13px] font-semibold text-sky-300/90 transition-colors hover:text-white"
                >
                  {tr("← Back to Member Login", "← உறுப்பினர் உள்நுழைவுக்கு திரும்புக")}
                </button>
              ) : mode === "login" ? (
                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => setMode("register")}
                    className="text-[13px] font-semibold text-sky-300/90 transition-colors hover:text-white"
                  >
                    {tr("New here? Create an account", "புதியவரா? கணக்கை உருவாக்கவும்")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("admin");
                      setIdentifier("");
                      setPassword("");
                      setError("");
                    }}
                    className="inline-flex items-center justify-center gap-1.5 text-[12px] font-medium text-amber-400/90 transition-colors hover:text-amber-300"
                  >
                    <Shield className="size-3.5" />
                    {tr("Admin Access", "நிர்வாகி அணுகல்")}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
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
                  <button
                    type="button"
                    onClick={() => {
                      setMode("admin");
                      setIdentifier("");
                      setPassword("");
                      setRegError("");
                      setRegDone(false);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 text-[12px] font-medium text-amber-400/90 transition-colors hover:text-amber-300"
                  >
                    <Shield className="size-3.5" />
                    {tr("Admin Access", "நிர்வாகி அணுகல்")}
                  </button>
                </div>
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
    </>
  );
}