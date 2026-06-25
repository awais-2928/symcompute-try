import { auth } from "@/auth"
import { prisma } from "@/prisma/prisma"
import { redirect } from "next/navigation"
import QuotationsClient from "./QuotationsClient"

export default async function QuotationsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { organizationId: true }
  })
  if (!user) redirect("/login")

  const [quotations, customers] = await Promise.all([
    prisma.quotation.findMany({
      where: { organizationId: user.organizationId, deletedAt: null },
      include: {
        customer: { select: { companyName: true } },
        createdBy: { select: { name: true } },
        items: true,
        purchaseOrders: { select: { id: true, poNumber: true, contractStatus: true, paymentStatus: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.customer.findMany({
      where: { organizationId: user.organizationId, deletedAt: null },
      select: { id: true, companyName: true }
    })
  ])

  // Serialize Decimal to numbers
  const serializedQuotations = quotations.map(q => ({
    ...q,
    totalCost: q.totalCost.toNumber(),
    profitMargin: q.profitMargin.toNumber(),
    sellingPrice: q.sellingPrice.toNumber(),
    items: q.items.map(item => ({
      ...item,
      cpuCost: item.cpuCost.toNumber(),
      ramCost: item.ramCost.toNumber(),
      storageCost: item.storageCost.toNumber(),
      ipCost: item.ipCost.toNumber(),
    }))
  }))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Quotations & Purchase Orders</h1>
          <p className="page-subtitle">Manage quotes, pricing, and purchase orders</p>
        </div>
      </div>
      <QuotationsClient quotations={serializedQuotations as unknown as typeof quotations} customers={customers} />
    </div>
  )
}
