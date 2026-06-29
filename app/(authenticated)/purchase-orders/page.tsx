import { auth } from "@/auth"
import { prisma } from "@/prisma/prisma"
import { redirect } from "next/navigation"
import PurchaseOrdersClient from "./PurchaseOrdersClient"

export default async function PurchaseOrdersPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { organizationId: true }
  })
  if (!user) redirect("/login")

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: { organizationId: user.organizationId, deletedAt: null },
    include: {
      customer: { select: { companyName: true } },
      quotation: { select: { quoteGroupId: true, version: true, sellingPrice: true } }
    },
    orderBy: { createdAt: "desc" }
  })

  // Serialize Decimal objects to numbers and convert dates to ISO strings for safety
  const serializedPOs = purchaseOrders.map((po) => ({
    id: po.id,
    poNumber: po.poNumber,
    poDate: po.poDate.toISOString(),
    contractStatus: po.contractStatus,
    paymentStatus: po.paymentStatus,
    createdAt: po.createdAt.toISOString(),
    customer: {
      companyName: po.customer.companyName,
    },
    quotation: {
      quoteGroupId: po.quotation.quoteGroupId,
      version: po.quotation.version,
      sellingPrice: po.quotation.sellingPrice.toNumber(),
    }
  }))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchase Orders</h1>
          <p className="page-subtitle">Manage purchase orders and contract statuses</p>
        </div>
      </div>
      <PurchaseOrdersClient initialPurchaseOrders={serializedPOs} />
    </div>
  )
}
