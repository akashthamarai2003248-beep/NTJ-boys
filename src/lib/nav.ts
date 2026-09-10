import {
  BarChart3, CalendarDays, HandCoins, Image as ImageIcon, LayoutDashboard,
  Settings, TrendingDown, Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  id: string;
  en: string;
  ta: string;
  href: string;
  icon: LucideIcon;
  /** shown on the mobile bottom bar (5 slots) */
  bottom?: boolean;
  phase2?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", en: "Dashboard", ta: "முகப்பு", href: "/", icon: LayoutDashboard, bottom: true },
  { id: "collections", en: "Collections", ta: "வரவு", href: "/collections", icon: HandCoins, bottom: true },
  { id: "expenses", en: "Expenses", ta: "செலவு", href: "/expenses", icon: TrendingDown, bottom: true },
  { id: "events", en: "Events", ta: "நிகழ்வுகள்", href: "/events", icon: CalendarDays, bottom: true },
  { id: "members", en: "Members", ta: "உறுப்பினர்கள்", href: "/members", icon: Users },
  { id: "reports", en: "Reports", ta: "அறிக்கைகள்", href: "/reports", icon: BarChart3 },
  { id: "gallery", en: "Gallery", ta: "புகைப்படங்கள்", href: "/gallery", icon: ImageIcon },
];

export const SETTINGS_ITEM: NavItem = { id: "settings", en: "Settings", ta: "அமைப்புகள்", href: "/settings", icon: Settings };

export const BOTTOM_NAV: NavItem[] = NAV_ITEMS.filter((n) => n.bottom);
export const MORE_ITEMS: NavItem[] = NAV_ITEMS.filter((n) => !n.bottom);
