import { auth } from "@/auth"
import { prisma } from "@/prisma/prisma"
import { redirect } from "next/navigation"
import AuditLogsClient from "./AuditLogsClient"

export default async function AuditLogsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userRole = (session.user as { role?: string }).role || "User"
  if (userRole !== "Super Admin") {
    redirect("/dashboard")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { organizationId: true },
  })
  if (!user) redirect("/login")

  const logs = await prisma.auditLog.findMany({
    where: { organizationId: user.organizationId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { timestamp: "desc" },
    take: 1000,
  })

  // Format changes payload as a string for display to avoid passing complex JSON objects to client components if unnecessary.
  // Actually, passing JSON is fine in Next.js 14+ Server Components to Client Components.
  const serializedLogs = logs.map(log => ({
    ...log,
    changes: JSON.stringify(log.changes)
  }))

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Audit Logs</h1>
        <p className="page-subtitle">View system-wide activity and modifications (Super Admin only)</p>
      </div>

      <AuditLogsClient logs={serializedLogs} />
    </div>
  )
}
