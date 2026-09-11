import { getSessionUser, toSessionUser } from "@/lib/auth";
import { SessionProvider } from "@/components/layout/session";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const dbUser = await getSessionUser().catch(() => null);
  const initialUser = dbUser ? toSessionUser(dbUser) : null;

  return (
    <SessionProvider initialUser={initialUser}>
      <AppShell initialUser={initialUser}>{children}</AppShell>
    </SessionProvider>
  );
}
