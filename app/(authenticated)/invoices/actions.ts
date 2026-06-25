"use server"

import { auth } from "@/auth"
import { prisma } from "@/prisma/prisma"
import { revalidatePath } from "next/cache"
import { PaymentStatus } from "@prisma/client"

async function getOrgId() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { organizationId: true } })
  if (!user) throw new Error("Not found")
  return user.organizationId
}

export async function createInvoice(data: {
  customerId: string
  amountDue: number
  dueDate: string
}) {
  try {
    const orgId = await getOrgId()
    const invoiceNumber = `INV-${Date.now()}`
    await prisma.invoice.create({
      data: {
        organizationId: orgId,
        invoiceNumber,
        customerId: data.customerId,
        amountDue: data.amountDue,
        amountPaid: 0,
        dueDate: new Date(data.dueDate),
      }
    })
    revalidatePath("/invoices")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to create invoice" }
  }
}

export async function recordPayment(id: string, amount: number) {
  try {
    await getOrgId()
    const invoice = await prisma.invoice.findUnique({ where: { id } })
    if (!invoice) return { success: false, error: "Invoice not found" }
    
    const newAmountPaid = Number(invoice.amountPaid) + amount
    const newStatus: PaymentStatus = newAmountPaid >= Number(invoice.amountDue)
      ? "PAID"
      : newAmountPaid > 0
      ? "PARTIAL"
      : "PENDING"

    await prisma.invoice.update({
      where: { id },
      data: { amountPaid: newAmountPaid, status: newStatus }
    })
    revalidatePath("/invoices")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to record payment" }
  }
}
