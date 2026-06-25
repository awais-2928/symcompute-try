import { auth } from "@/auth"
import { prisma } from "@/prisma/prisma"
import { redirect } from "next/navigation"
import ProvisioningClient from "./ProvisioningClient"

export default async function ProvisioningPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { organizationId: true } })
  if (!user) redirect("/login")

  const [tasks, staff, purchaseOrders, customers, servers] = await Promise.all([
    prisma.provisioningTask.findMany({
      where: { organizationId: user.organizationId },
      include: {
        po: true,
        customer: { select: { companyName: true } },
        engineer: { select: { name: true } },
        server: { select: { serverName: true } }
      },
      orderBy: { createdDate: "desc" }
    }),
    prisma.user.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      select: { id: true, name: true }
    }),
    prisma.purchaseOrder.findMany({
      where: { organizationId: user.organizationId }
    }),
    prisma.customer.findMany({
      where: { organizationId: user.organizationId }
    }),
    prisma.bareMetalServer.findMany({
      where: { organizationId: user.organizationId }
    })
  ])

  // Serialize Decimal to numbers
  const serializedServers = servers.map(s => ({
    ...s,
    monthlyRentalCost: s.monthlyRentalCost.toNumber(),
    conversionRate: s.conversionRate.toNumber(),
    oneTimeSetupCost: s.oneTimeSetupCost.toNumber(),
    ipSetupCost: s.ipSetupCost.toNumber(),
  }))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Provisioning Tasks</h1>
          <p className="page-subtitle">Track and manage infrastructure provisioning workflows</p>
        </div>
      </div>
      <ProvisioningClient tasks={tasks as unknown as typeof tasks} staff={staff} purchaseOrders={purchaseOrders} customers={customers} servers={serializedServers as unknown as typeof servers} />
    </div>
  )
}
