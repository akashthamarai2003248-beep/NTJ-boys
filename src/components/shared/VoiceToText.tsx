"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useLang, type TFunc } from "@/lib/i18n";
import { cn } from "@/lib/utils/cn";

interface Props {
  /** Called once with the final transcript when the admin stops speaking. */
  onTranscript: (text: string) => void;
  /** English example sentence shown while listening. */
  example?: string;
  /** Tamil example sentence shown while listening (when the த toggle is on). */
  exampleTa?: string;
  /** Idle hint shown under the button; defaults to the collection phrasing. */
  prompt?: string;
  /** Tamil idle hint shown under the button. */
  promptTa?: string;
}

function createRecognition(): SpeechRecognition | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

function describeError(error: string, t: TFunc): string {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return t(
        "Microphone access denied — allow the mic in your browser and try again.",
        "மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது — உலாவியில் மைக்ரோஃபோனை அனுமதித்து மீண்டும் முயற்சிக்கவும்.",
      );
    case "network":
      return t("Speech service unreachable — check your internet connection.", "பேச்சு சேவை கிடைக்கவில்லை — இணைய இணைப்பைச் சரிபார்க்கவும்.");
    case "no-speech":
      return t("No speech heard — try again.", "பேச்சு கேட்கப்படவில்லை — மீண்டும் முயற்சிக்கவும்.");
    case "audio-capture":
      return t("No microphone found on this device.", "இந்த சாதனத்தில் மைக்ரோஃபோன் இல்லை.");
    case "language-not-supported":
      return t("This language is not supported for voice input.", "இந்த மொழியில் குரல் உள்ளீடு ஆதரிக்கப்படவில்லை.");
    default:
      return t("Speech recognition failed — please try again.", "குரல் அங்கீகாரம் தோல்வியடைந்தது — மீண்டும் முயற்சிக்கவும்.");
  }
}

/**
 * Mic button that turns a spoken contribution into text. Uses the browser's
 * Web Speech API (Chrome / Edge / Safari). The admin picks English or Tamil
 * with the EN/த toggle; the transcript is handed to `onTranscript` and the
 * calling form fills only the text fields it manages.
 */
export function VoiceToText({ onTranscript, example, exampleTa, prompt, promptTa }: Props) {
  const { t, lang } = useLang();
  const [supported] = useState(() => Boolean(createRecognition()));
  const [langChoice, setLangChoice] = useState<"en" | "ta">(lang === "ta" ? "ta" : "en");
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognition | null>(null);
  const finalRef = useRef("");
  const committedRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  });

  const commit = useCallback(() => {
    const text = finalRef.current.trim();
    committedRef.current = true;
    setListening(false);
    setInterim("");
    if (text) onTranscriptRef.current(text);
  }, []);

  const start = useCallback(() => {
    const rec = createRecognition();
    if (!rec) return;
    finalRef.current = "";
    committedRef.current = false;
    setError(null);
    setInterim("");
    rec.lang = langChoice === "ta" ? "ta-IN" : "en-IN";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let final = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interimText += r[0].transcript;
      }
      finalRef.current = final;
      setInterim(`${final} ${interimText}`.trim());
    };
    rec.onend = () => {
      // browser stopped on its own (silence) → commit what we heard
      if (!committedRef.current) commit();
    };
    rec.onerror = (e) => {
      if (e.error === "aborted") return; // our own stop()
      setListening(false);
      setError(describeError(e.error, t));
    };
    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
      setError(t("Could not start the microphone.", "மைக்ரோஃபோனைத் தொடங்க முடியவில்லை."));
    }
  }, [langChoice, t, commit]);

  const stop = useCallback(() => {
    commit();
    try {
      recRef.current?.abort();
    } catch {
      /* already stopped */
    }
    recRef.current = null;
  }, [commit]);

  // never leave the mic running when the form unmounts
  useEffect(() => {
    return () => {
      try {
        recRef.current?.abort();
      } catch {
        /* already stopped */
      }
    };
  }, []);

  if (!supported) {
    return (
      <p className="rounded-xl border border-line bg-surface-2/50 px-3 py-2.5 text-[12px] text-faint">
        {t(
          "Voice to text needs Chrome, Edge or Safari — your browser doesn't support it.",
          "குரல் உரைக்கு Chrome, Edge அல்லது Safari தேவை — உங்கள் உலாவி ஆதரிக்கவில்லை.",
        )}
      </p>
    );
  }

  const listeningHint =
    langChoice === "ta"
      ? (exampleTa ?? "கேட்கிறது… பெயரைச் சொல்லுங்கள், எ.கா. “ரவி குமார்”.")
      : (example ?? "Listening… say the person's name, e.g. “Ravi Kumar”.");
  const idleHint =
    langChoice === "ta"
      ? (promptTa ?? "பங்களிப்பைப் பேசுங்கள் — படிவம் தானாக நிரம்பும்.")
      : (prompt ?? "Dictate a contribution — the form fills itself.");

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5",
        listening ? "border-red-400/50 bg-red-500/5" : "border-saffron-500/40 bg-saffron-500/5",
      )}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <Button type="button" variant={listening ? "danger" : "navy"} size="sm" onClick={listening ? stop : start}>
          {listening ? <Square className="size-3.5" fill="currentColor" /> : <Mic className="size-4" />}
          {listening ? t("Stop & fill", "நிறுத்தி நிரப்பு") : t("Voice to text", "பேச்சிலிருந்து உரை")}
        </Button>
        <div
          role="group"
          aria-label={t("Speech language", "பேச்சு மொழி")}
          className="flex items-center gap-0.5 rounded-lg border border-line bg-surface-2/70 p-0.5"
        >
          <button
            type="button"
            disabled={listening}
            aria-pressed={langChoice === "en"}
            onClick={() => setLangChoice("en")}
            className={cn(
              "rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide transition-colors disabled:opacity-60",
              langChoice === "en" ? "bg-saffron-500 text-white" : "text-muted hover:text-ink",
            )}
          >
            EN
          </button>
          <button
            type="button"
            disabled={listening}
            aria-pressed={langChoice === "ta"}
            onClick={() => setLangChoice("ta")}
            className={cn(
              "rounded-md px-2 py-0.5 text-[11px] font-bold transition-colors disabled:opacity-60",
              langChoice === "ta" ? "bg-saffron-500 text-white" : "text-muted hover:text-ink",
            )}
          >
            த
          </button>
        </div>
        <p
          className={cn(
            "min-w-0 flex-1 text-[12.5px]",
            listening ? "font-medium text-red-600 dark:text-red-400" : "text-muted",
          )}
        >
          {listening ? listeningHint : idleHint}
        </p>
      </div>
      {interim && <p className="mt-1.5 text-[12px] italic text-muted">“{interim}”</p>}
      {error && !listening && <p className="mt-1.5 text-[12px] font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}