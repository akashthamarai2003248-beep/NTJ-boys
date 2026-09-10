import type { Metadata } from "next";
import { ReceiptsView } from "@/components/receipt/ReceiptsView";

export const metadata: Metadata = { title: "Receipts" };

export default function ReceiptsPage() {
  return <ReceiptsView />;
}
