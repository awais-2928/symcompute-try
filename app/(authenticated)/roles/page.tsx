import { auth } from "@/auth"
import { prisma } from "@/prisma/prisma"
import { redirect } from "next/navigation"
import RolesClient from "./RolesClient"

export default async function RolesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { roleAssignments: { include: { role: true } } }
  })
  if (!user) redirect("/login")

  // Check if Super Admin
  const isSuperAdmin = user.roleAssignments.some((ra) => ra.role.name === "Super Admin")
  if (!isSuperAdmin) {
    redirect("/dashboard")
  }

  const roles = await prisma.role.findMany({
    where: { organizationId: user.organizationId, deletedAt: null },
    include: {
      _count: { select: { users: true } },
      permissions: { include: { permission: true } }
    },
    orderBy: { createdAt: "asc" }
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Role Management</h1>
          <p className="page-subtitle">Manage roles and permissions for your organization</p>
        </div>
      </div>
      <RolesClient roles={roles} />
    </div>
  )
}
