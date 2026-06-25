import { auth } from "@/auth"
import { prisma } from "@/prisma/prisma"
import { redirect } from "next/navigation"
import InvoicesClient from "./InvoicesClient"

export default async function InvoicesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { organizationId: true } })
  if (!user) redirect("/login")

  const [invoices, customers] = await Promise.all([
    prisma.invoice.findMany({
      where: { organizationId: user.organizationId },
      include: { customer: { select: { companyName: true } } },
      orderBy: { dueDate: "desc" }
    }),
    prisma.customer.findMany({
      where: { organizationId: user.organizationId }
    })
  ])

  const serializedInvoices = invoices.map(i => ({
    ...i,
    amountDue: i.amountDue.toNumber(),
    amountPaid: i.amountPaid.toNumber(),
  }))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">Manage billing and invoice payments</p>
        </div>
      </div>
      <InvoicesClient invoices={serializedInvoices as unknown as typeof invoices} customers={customers} />
    </div>
  )
}
