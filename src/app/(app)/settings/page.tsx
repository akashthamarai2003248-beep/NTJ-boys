import type { Metadata } from "next";
import { SettingsView } from "@/components/settings/SettingsView";

export const metadata: Metadata = { title: "Settings · அமைப்புகள்" };

export default function SettingsPage() {
  return <SettingsView />;
}
