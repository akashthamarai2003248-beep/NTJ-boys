import type { Metadata } from "next";
import { GameDetailView } from "@/components/game/GameDetailView";

export const metadata: Metadata = { title: "Game" };

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GameDetailView id={id} />;
}
