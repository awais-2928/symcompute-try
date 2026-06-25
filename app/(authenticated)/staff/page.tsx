import { auth } from "@/auth"
import { prisma } from "@/prisma/prisma"
import { redirect } from "next/navigation"
import StaffClient from "./StaffClient"

export default async function StaffPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { roleAssignments: { include: { role: true } } }
  })
  if (!user) redirect("/login")

  const isSuperAdmin = user.roleAssignments.some((ra) => ra.role.name === "Super Admin")
  if (!isSuperAdmin) redirect("/dashboard")

  const [staff, roles] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: user.organizationId, deletedAt: null },
      include: {
        roleAssignments: { include: { role: { select: { id: true, name: true } } } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.role.findMany({
      where: { organizationId: user.organizationId, deletedAt: null },
      select: { id: true, name: true }
    })
  ])

  const serializedStaff = staff.map(s => ({
    ...s,
    targetAmount: s.targetAmount ? s.targetAmount.toNumber() : null,
  }))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p className="page-subtitle">Manage staff accounts, roles, and access</p>
        </div>
      </div>
      <StaffClient staff={serializedStaff as unknown as typeof staff} roles={roles} currentUserId={session.user.id} />
    </div>
  )
}
