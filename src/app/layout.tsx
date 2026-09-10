import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Tamil } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { LanguageProvider } from "@/lib/i18n";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const notoSansTamil = Noto_Sans_Tamil({
  variable: "--font-tamil",
  subsets: ["tamil"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Nethaji Boys Mandram",
    template: "%s · Nethaji Boys Mandram",
  },
  description:
    "நேதாஜி பாய்ஸ் மன்றம் — Community management platform for collections, expenses, events, sports and members.",
  applicationName: "Nethaji Boys Mandram",
  icons: {
    icon: "/nbm-logo.png",
    apple: "/nbm-logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f4fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a101f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${notoSansTamil.variable} antialiased`}
    >
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <LanguageProvider>
            {children}
            <Toaster
              position="top-center"
              richColors={false}
              toastOptions={{
                className:
                  "!rounded-xl !border !border-line !bg-surface !text-ink !shadow-pop text-sm",
              }}
            />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
