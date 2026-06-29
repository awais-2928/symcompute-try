import { auth } from "@/auth"
import { prisma } from "@/prisma/prisma"
import { redirect } from "next/navigation"
import AuditLogsClient from "./AuditLogsClient"
import { AuditAction } from "@prisma/client"

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
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

  const resolvedParams = await searchParams
  const actionFilter = typeof resolvedParams.action === "string" && resolvedParams.action ? (resolvedParams.action as AuditAction) : undefined
  const userIdFilter = typeof resolvedParams.userId === "string" && resolvedParams.userId ? resolvedParams.userId : undefined

  const logs = await prisma.auditLog.findMany({
    where: { 
      organizationId: user.organizationId,
      ...(actionFilter && { action: actionFilter }),
      ...(userIdFilter && { userId: userIdFilter }),
    },
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

  const allUsers = await prisma.user.findMany({
    where: { organizationId: user.organizationId },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" }
  })

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Audit Logs</h1>
        <p className="page-subtitle">View system-wide activity and modifications (Super Admin only)</p>
      </div>

      <AuditLogsClient 
        logs={serializedLogs} 
        users={allUsers} 
        currentAction={actionFilter || ""}
        currentUserId={userIdFilter || ""}
      />
    </div>
  )
}
