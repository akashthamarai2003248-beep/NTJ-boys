"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Copy, Database, Eye, EyeOff, Info, Languages, Link2, LogOut, Moon, Monitor, Palette, ShieldCheck, Sun, UserRound,
} from "lucide-react";
import { api } from "@/lib/client/api";
import { useFetch } from "@/lib/client/hooks";
import { usePermissions, useSession } from "@/components/layout/session";
import { LANG_OPTIONS, useLang } from "@/lib/i18n";
import { PageHeader } from "@/components/shared/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils/cn";

interface SettingsPayload { settings: { publicView: boolean } }

const THEMES = [
  { id: "light", label: "Light", ta: "ஒளி", icon: Sun },
  { id: "dark", label: "Dark", ta: "இருள்", icon: Moon },
  { id: "system", label: "System", ta: "அமைப்பு", icon: Monitor },
] as const;

export function SettingsView() {
  const { user, signOut } = useSession();
  const { can, role } = usePermissions();
  const { theme, setTheme } = useTheme();
  const { t, lang, setLang } = useLang();
  const { data, reload } = useFetch<SettingsPayload>("/api/settings");
  const [savingView, setSavingView] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const publicView = data?.settings.publicView ?? true;

  const copyPublicLink = async () => {
    const url = `${window.location.origin}/public`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("Public link copied — share it with the street", "பொது இணைப்பு நகலெடுக்கப்பட்டது — தெருவுடன் பகிருங்கள்"));
    } catch {
      toast.error(t("Could not copy — select “/public” manually", "நகலெடுக்க முடியவில்லை — “/public” பாதையை கைமுறையாக தேர்ந்தெடுக்கவும்"));
    }
  };

  const togglePublicView = async (value: boolean) => {
    setSavingView(true);
    try {
      await api.patch("/api/settings", { publicView: value });
      toast.success(value ? t("Public view enabled", "பொது பார்வை இயக்கப்பட்டது") : t("Public view disabled", "பொது பார்வை முடக்கப்பட்டது"));
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingView(false);
    }
  };

  const resetDemo = async () => {
    setResetting(true);
    try {
      await api.post("/api/demo/reset");
      toast.success(t("Demo data reset to defaults", "மாதிரித் தரவு மீட்டமைக்கப்பட்டது"));
      setConfirmReset(false);
      reload();
      window.location.reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Settings"
        ta="அமைப்புகள்"
        subtitle={t("Preferences, transparency and data for your Mandram account", "மொழி, தோற்றம், வெளிப்படைத்தன்மை மற்றும் தரவு அமைப்புகள்")}
      />

      {/* profile */}
      <section className="card-surface rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-4">
          {user && <Avatar name={user.name} size="xl" />}
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-extrabold">{user?.name}</p>
            <p className="mt-0.5 text-[12.5px] text-muted">{user?.email}{user?.phone ? ` · +91 ${user.phone}` : ""}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge tone={role === "admin" ? "gold" : role === "treasurer" ? "saffron" : "navy"}>{user?.position ?? role}</Badge>
              <span className="text-[11px] font-medium capitalize text-faint">
                {role === "admin" ? t("Administrator — full access", "நிர்வாகி — முழு அணுகல்") : role === "treasurer" ? t("Treasurer — finance access", "பொருளாளர் — நிதி அணுகல்") : t("Member — view access", "உறுப்பினர் — பார்வை அணுகல்")}
              </span>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void signOut()}>
            <LogOut className="size-3.5" /> {t("Sign out", "வெளியேறு")}
          </Button>
        </div>
      </section>

      {/* appearance */}
      <section className="card-surface rounded-2xl p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-navy-100 text-navy-700 dark:bg-navy-500/15 dark:text-navy-200">
            <Palette className="size-4.5" />
          </span>
          <div>
            <h2 className="text-[14.5px] font-extrabold">{t("Appearance", "தோற்றம்")}</h2>
            <p className="text-[12px] text-muted">{t("choose light, dark or follow the device", "ஒளி, இருள் அல்லது சாதன அமைப்பைத் தேர்ந்தெடுக்கவும்")}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {THEMES.map((t) => {
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border px-3 py-3.5 transition-all",
                  active
                    ? "border-saffron-500 bg-saffron-50 text-ink shadow-[0_0_0_1px] shadow-saffron-500/40 dark:bg-saffron-500/10"
                    : "border-line bg-surface-2/50 text-muted hover:border-line-strong hover:text-ink",
                )}
              >
                <t.icon className="size-5" />
                <span className="text-[12.5px] font-bold">{lang === "en" ? t.label : t.ta}</span>
                <span className="text-[10px] text-faint">{lang === "both" ? t.label : lang === "en" ? t.ta : ""}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* language */}
      <section className="card-surface rounded-2xl p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-saffron-100 text-saffron-700 dark:bg-saffron-500/15 dark:text-saffron-400">
            <Languages className="size-4.5" />
          </span>
          <div>
            <h2 className="text-[14.5px] font-extrabold">{t("Language", "மொழி")}</h2>
            <p className="text-[12px] text-muted">{t("How the whole app reads for you", "முழு பயன்பாடும் எந்த மொழியில் தோன்ற வேண்டும்")}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {LANG_OPTIONS.map((o) => {
            const active = lang === o.value;
            return (
              <button
                key={o.value}
                onClick={() => setLang(o.value)}
                aria-pressed={active}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3.5 transition-all",
                  active
                    ? "border-saffron-500 bg-saffron-50 text-ink shadow-[0_0_0_1px] shadow-saffron-500/40 dark:bg-saffron-500/10"
                    : "border-line bg-surface-2/50 text-muted hover:border-line-strong hover:text-ink",
                )}
              >
                <span className="text-[12.5px] font-bold">{o.value === "en" ? o.label : lang === "en" ? o.label : o.ta}</span>
                <span className="text-[9.5px] leading-tight text-faint">
                  {o.value === "en" ? "English" : o.value === "ta" ? "தமிழ்" : "English + தமிழ்"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* transparency */}
      <section className="card-surface rounded-2xl p-5">
        <div className="flex items-center gap-2.5">
          <span className={cn("flex size-9 items-center justify-center rounded-xl", publicView ? "bg-leaf-100 text-leaf-700 dark:bg-leaf-500/15 dark:text-leaf-400" : "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300")}>
            {publicView ? <Eye className="size-4.5" /> : <EyeOff className="size-4.5" />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[14.5px] font-extrabold">{t("Public transparency view", "பொது வெளிப்படைத்தன்மை பார்வை")}</h2>
            <p className="text-[12px] text-muted">{t("Share totals with the whole street — never private phone numbers", "மொத்தத் தொகைகளை ஊருடன் பகிருங்கள் — தனிப்பட்ட தொலைபேசி எண்கள் ஒருபோதும் இல்லை")}</p>
          </div>
          {can.settings ? (
            <button
              role="switch"
              aria-checked={publicView}
              disabled={savingView}
              onClick={() => togglePublicView(!publicView)}
              className={cn(
                "relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60",
                publicView ? "bg-leaf-600" : "bg-line-strong",
              )}
            >
              <span className={cn("absolute top-0.5 size-6 rounded-full bg-white shadow transition-all", publicView ? "left-[22px]" : "left-0.5")} />
            </button>
          ) : (
            <Badge tone="muted" className="shrink-0"><ShieldCheck className="size-3" /> {t("Admin only", "நிர்வாகி மட்டும்")}</Badge>
          )}
        </div>
        <div className={cn("mt-4 rounded-xl border p-3.5 text-[12.5px] leading-relaxed", publicView ? "border-leaf-200 bg-leaf-50 text-leaf-800 dark:border-leaf-500/25 dark:bg-leaf-500/10 dark:text-leaf-300" : "border-line bg-surface-2 text-muted")}>
          {publicView
            ? t("Public view is ON — members can see total income, spending, balance and event summaries at the transparency link. Phone numbers and personal notes stay private.", "பொது பார்வை இயக்கத்தில் உள்ளது — உறுப்பினர்கள் மொத்த வரவு, செலவு, இருப்பு மற்றும் நிகழ்வு சுருக்கங்களை வெளிப்படைத்தன்மை இணைப்பில் காணலாம். தொலைபேசி எண்களும் தனிப்பட்ட குறிப்புகளும் தனிப்பட்டதாகவே இருக்கும்.")
            : t("Public view is OFF — the transparency page is hidden.", "பொது பார்வை முடக்கத்தில் உள்ளது — வெளிப்படைத்தன்மை பக்கம் மறைக்கப்பட்டுள்ளது.")}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-2/60 px-3.5 py-2.5">            <p className="flex items-center gap-2 truncate font-mono text-[12px] font-semibold text-muted">
              <Link2 className="size-3.5 shrink-0 text-faint" />
              <span className="truncate">{typeof window !== "undefined" ? `${window.location.origin}/public` : "/public"}</span>
            </p>
          <Button variant="secondary" size="sm" onClick={() => void copyPublicLink()} disabled={!publicView}>
            <Copy className="size-3.5" /> {t("Copy link", "இணைப்பை நகலெடு")}
          </Button>
        </div>
      </section>

      {/* data */}
      <section className="card-surface rounded-2xl p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gold-100 text-gold-700 dark:bg-gold-400/15 dark:text-gold-300">
            <Database className="size-4.5" />
          </span>
          <div className="flex-1">
            <h2 className="text-[14.5px] font-extrabold">{t("Demo data", "மாதிரித் தரவு")}</h2>
            <p className="text-[12px] text-muted">{t("This development build runs on a local sample store", "இந்த மேம்பாட்டு பதிப்பு உள்ளூர் மாதிரி சேமிப்பில் இயங்குகிறது")}</p>
          </div>
          <Badge tone="gold">DEMO</Badge>
        </div>
        <div className="mt-3.5 grid gap-3 text-[12.5px] leading-relaxed text-muted sm:grid-cols-2">
          <p className="flex items-start gap-2"><Info className="mt-0.5 size-3.5 shrink-0 text-faint" /> {t("Seeded with 28 members, realistic Tamil Nadu collections & expenses (totals exactly ₹85,500 / ₹42,750) and the Vinayagar, Pongal and Sports events. Data is clearly sample — nothing real is stored.", "28 உறுப்பினர்கள், தமிழ்நாட்டின் யதார்த்தமான வரவு & செலவுகள் (மொத்தம் ₹85,500 / ₹42,750) மற்றும் விநாயகர், பொங்கல், விளையாட்டு நிகழ்வுகளுடன் மாதிரி தரவு. இது மாதிரி தரவு மட்டுமே — உண்மையான எதுவும் சேமிக்கப்படவில்லை.")}</p>
          <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-faint" /> {t("Production path: PostgreSQL + RLS via Supabase. Set the Supabase keys to switch — no service-role keys ever reach the browser.", "உற்பத்தி பாதை: Supabase வழியாக PostgreSQL + RLS. மாற்ற Supabase விசைகளை அமைக்கவும் — service-role விசைகள் உலாவியை ஒருபோதும் அடையாது.")}</p>
        </div>
        {can.settings ? (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-[12px] font-medium text-muted">{t("Re-seed the demo store with fresh sample records.", "புதிய மாதிரி பதிவுகளுடன் மாதிரி சேமிப்பை மீண்டும் நிரப்புங்கள்.")}</p>
            <Button variant="secondary" size="sm" onClick={() => setConfirmReset(true)}>
              <Database className="size-3.5" /> {t("Reset demo data", "மாதிரித் தரவை மீட்டமை")}
            </Button>
          </div>
        ) : null}
      </section>

      <section className="flex items-center justify-between rounded-2xl border border-line bg-surface-2/60 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <UserRound className="size-4 text-faint" />
          <p className="text-[12px] font-medium text-muted">
            {t("Nethaji Boys Mandram", "நேதாஜி பாய்ஸ் மன்றம்")}{" "}
            <span className="text-faint">— {t("v0.2 · Games, receipts, reports & gallery included", "v0.2 · விளையாட்டுகள், ரசீதுகள், அறிக்கைகள் & புகைப்படங்கள் சேர்க்கப்பட்டுள்ளன")}</span>
          </p>
        </div>
        <p className="hidden text-[11px] font-semibold text-faint sm:block">{t("Unity · Community · Transparency · Celebration", "ஒற்றுமை · சமூகம் · வெளிப்படைத்தன்மை · கொண்டாட்டம்")}</p>
      </section>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={resetDemo}
        loading={resetting}
        title={t("Reset demo data?", "மாதிரித் தரவை மீட்டமைக்கவா?")}
        body={t("All current demo records will be replaced with the original sample set. This cannot be undone.", "தற்போதைய அனைத்து மாதிரி பதிவுகளும் அசல் மாதிரி தொகுப்புடன் மாற்றப்படும். இதை மீட்டெடுக்க முடியாது.")}
        confirmLabel={t("Reset", "மீட்டமை")}
      />
    </div>
  );
}
