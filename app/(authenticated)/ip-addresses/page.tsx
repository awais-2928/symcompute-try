import { auth } from "@/auth"
import { prisma } from "@/prisma/prisma"
import { redirect } from "next/navigation"
import IpAddressesClient from "./IpAddressesClient"

export default async function IpAddressesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { organizationId: true } })
  if (!user) redirect("/login")

  const [ipAddresses, servers, vms] = await Promise.all([
    prisma.ipAddress.findMany({
      where: { server: { organizationId: user.organizationId }, deletedAt: null },
      include: {
        server: { select: { serverName: true } },
        vm: { select: { vmName: true, customer: { select: { companyName: true } } } }
      },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.bareMetalServer.findMany({
      where: { organizationId: user.organizationId, deletedAt: null },
      select: { id: true, serverName: true }
    }),
    prisma.vm.findMany({
      where: { organizationId: user.organizationId, deletedAt: null },
      select: { id: true, vmName: true, customer: { select: { companyName: true } } }
    })
  ])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">IP Address Management</h1>
          <p className="page-subtitle">Track and allocate IP addresses across your infrastructure</p>
        </div>
      </div>
      <IpAddressesClient ipAddresses={ipAddresses} servers={servers} vms={vms} />
    </div>
  )
}
