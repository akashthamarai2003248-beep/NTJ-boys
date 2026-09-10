import { Suspense } from "react";
import type { Metadata } from "next";
import { GamesView } from "@/components/game/GamesView";

export const metadata: Metadata = { title: "Games" };

export default function GamesPage() {
  return (
    <Suspense fallback={null}>
      <GamesView />
    </Suspense>
  );
}
