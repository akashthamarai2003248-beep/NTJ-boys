import type { Metadata } from "next";
import { MembersView } from "@/components/member/MembersView";

export const metadata: Metadata = { title: "Members · உறுப்பினர்கள்" };

export default function MembersPage() {
  return <MembersView />;
}
