import { auth } from "@/auth"
import { prisma } from "@/prisma/prisma"
import { redirect } from "next/navigation"
import VmsClient from "./VmsClient"

export default async function VmsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { organizationId: true }
  })
  if (!user) redirect("/login")

  const [vms, servers, customers] = await Promise.all([
    prisma.vm.findMany({
      where: { organizationId: user.organizationId, deletedAt: null },
      include: {
        server: { select: { serverName: true, dataCenterName: true } },
        customer: { select: { companyName: true } },
        ips: { select: { ipAddress: true, status: true } },
        upgradeHistory: { orderBy: { timestamp: "desc" } }
      },
      orderBy: { creationDate: "desc" }
    }),
    prisma.bareMetalServer.findMany({
      where: { organizationId: user.organizationId, deletedAt: null, status: "ACTIVE" },
      select: { id: true, serverName: true, dataCenterName: true, ramGb: true, storageGb: true }
    }),
    prisma.customer.findMany({
      where: { organizationId: user.organizationId, deletedAt: null, status: "ACTIVE" },
      select: { id: true, companyName: true }
    })
  ])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">VM & IP Management</h1>
          <p className="page-subtitle">Manage virtual machines and IP address allocations</p>
        </div>
      </div>
      <VmsClient vms={vms} servers={servers} customers={customers} />
    </div>
  )
}
