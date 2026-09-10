import type { Metadata } from "next";
import { PublicView } from "@/components/public/PublicView";

export const metadata: Metadata = {
  title: "Transparency",
  description:
    "Nethaji Boys Mandram — public transparency: collection, expenses and event balances without private details.",
};

export default function PublicPage() {
  return <PublicView />;
}
