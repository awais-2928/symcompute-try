import { auth } from "@/auth"
import { redirect } from "next/navigation"
import SidebarClient from "./SidebarClient"

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const userName = session.user.name || session.user.email || "User"
  const userRole = (session.user as { role?: string }).role || "User"

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 h-full overflow-hidden">
        <SidebarClient userName={userName} userRole={userRole} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
