import { Sidebar } from "@/components/layout/Sidebar";
import { requireAdminSession } from "@/lib/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdminSession();

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <Sidebar userName={user.displayName} />
      <main className="flex-1 min-w-0 overflow-y-auto pt-14 lg:pt-0 pb-8">{children}</main>
    </div>
  );
}
