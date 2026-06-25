import { auth } from "@/auth"
import { prisma } from "@/prisma/prisma"
import { redirect } from "next/navigation"
import ServersClient from "./ServersClient"

export default async function ServersPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { organizationId: true }
  })

  if (!user) redirect("/login")

  const servers = await prisma.bareMetalServer.findMany({
    where: { organizationId: user.organizationId, deletedAt: null },
    include: {
      _count: { select: { vms: true, ips: true } }
    },
    orderBy: { createdAt: "desc" }
  })

  // Serialize Prisma Decimal to numbers
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
          <h1 className="page-title">Server Management</h1>
          <p className="page-subtitle">Manage your bare metal server inventory</p>
        </div>
      </div>
      <ServersClient servers={serializedServers as unknown as typeof servers} />
    </div>
  )
}
