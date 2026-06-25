import { auth } from "@/auth"
import { prisma } from "@/prisma/prisma"
import { redirect } from "next/navigation"
import CustomersClient from "./CustomersClient"

export default async function CustomersPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { organizationId: true }
  })
  if (!user) redirect("/login")

  const customers = await prisma.customer.findMany({
    where: { organizationId: user.organizationId, deletedAt: null },
    include: {
      contacts: true,
      _count: { select: { vms: true, quotations: true } }
    },
    orderBy: { createdAt: "desc" }
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Management</h1>
          <p className="page-subtitle">Manage your client accounts and contacts</p>
        </div>
      </div>
      <CustomersClient customers={customers} />
    </div>
  )
}
