"use server"

import { auth } from "@/auth"
import { prisma } from "@/prisma/prisma"
import { revalidatePath } from "next/cache"
import { CustomerStatus } from "@prisma/client"

async function getOrgId() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { organizationId: true } })
  if (!user) throw new Error("Not found")
  return user.organizationId
}

export async function createCustomer(data: {
  companyName: string
  companyAddress: string
  ntnNumber?: string
  stnNumber?: string
  website?: string
  landlineNumber?: string
  status: CustomerStatus
}) {
  try {
    const orgId = await getOrgId()
    await prisma.customer.create({ data: { organizationId: orgId, ...data } })
    revalidatePath("/customers")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to create customer" }
  }
}

export async function updateCustomer(id: string, data: Partial<{
  companyName: string
  companyAddress: string
  ntnNumber: string
  stnNumber: string
  website: string
  landlineNumber: string
  status: CustomerStatus
  discontinuationReason: string
  discontinuationDate: string
  disputeNotes: string
}>) {
  try {
    await getOrgId()
    const updateData: Record<string, unknown> = { ...data }
    if (data.discontinuationDate) {
      updateData.discontinuationDate = new Date(data.discontinuationDate)
    }
    await prisma.customer.update({ where: { id }, data: updateData })
    revalidatePath("/customers")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to update customer" }
  }
}

export async function deleteCustomer(id: string) {
  try {
    await getOrgId()
    await prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } })
    revalidatePath("/customers")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to delete customer" }
  }
}

export async function createContact(customerId: string, data: {
  type: string
  name: string
  designation: string
  email: string
  phone: string
}) {
  try {
    await getOrgId()
    await prisma.customerContact.create({ data: { customerId, ...data } })
    revalidatePath("/customers")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to add contact" }
  }
}
