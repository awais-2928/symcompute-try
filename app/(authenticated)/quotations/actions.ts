"use server"

import { auth } from "@/auth"
import { prisma } from "@/prisma/prisma"
import { revalidatePath } from "next/cache"
import { QuoStatus } from "@prisma/client"
import { randomUUID } from "crypto"

async function getOrgAndUser() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { organizationId: true, id: true } })
  if (!user) throw new Error("Not found")
  return user
}

export async function createQuotation(data: {
  customerId: string
  expiryDate: string
  profitMargin: number
  items: Array<{
    vmNameLabel?: string
    cpuCores: number
    ramGb: number
    storageGb: number
    quantity: number
    cpuCost: number
    ramCost: number
    storageCost: number
    ipCost: number
  }>
  firewallRequired?: boolean
  activeDirectoryServer?: boolean
  rdpServer?: boolean
  cloudStorageRequiredGb?: number
  microsoftOs?: boolean
  cPanel?: boolean
  extraIpsCount?: number
}) {
  try {
    const user = await getOrgAndUser()
    
    // Calculate total cost from items
    const totalCost = data.items.reduce((sum, item) => {
      return sum + (item.cpuCost + item.ramCost + item.storageCost + item.ipCost) * item.quantity
    }, 0)
    const sellingPrice = totalCost * (1 + data.profitMargin / 100)

    await prisma.quotation.create({
      data: {
        organizationId: user.organizationId,
        quoteGroupId: randomUUID(),
        customerId: data.customerId,
        createdById: user.id,
        expiryDate: new Date(data.expiryDate),
        totalCost,
        profitMargin: data.profitMargin,
        sellingPrice,
        firewallRequired: data.firewallRequired || false,
        activeDirectoryServer: data.activeDirectoryServer || false,
        rdpServer: data.rdpServer || false,
        cloudStorageRequiredGb: data.cloudStorageRequiredGb || 0,
        microsoftOs: data.microsoftOs || false,
        cPanel: data.cPanel || false,
        extraIpsCount: data.extraIpsCount || 0,
        items: {
          create: data.items.map((item) => ({
            vmNameLabel: item.vmNameLabel || null,
            cpuCores: item.cpuCores,
            ramGb: item.ramGb,
            storageGb: item.storageGb,
            quantity: item.quantity,
            cpuCost: item.cpuCost,
            ramCost: item.ramCost,
            storageCost: item.storageCost,
            ipCost: item.ipCost,
          }))
        }
      }
    })
    revalidatePath("/quotations")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to create quotation" }
  }
}

export async function createQuotationRevision(baseQuoteId: string, data: Parameters<typeof createQuotation>[0]) {
  try {
    const user = await getOrgAndUser()
    const baseQuote = await prisma.quotation.findUnique({ where: { id: baseQuoteId } })
    if (!baseQuote) return { success: false, error: "Base quote not found" }

    const latestVersion = await prisma.quotation.findFirst({
      where: { quoteGroupId: baseQuote.quoteGroupId },
      orderBy: { version: 'desc' }
    })
    
    const newVersion = (latestVersion?.version || baseQuote.version) + 1

    await prisma.quotation.update({
      where: { id: baseQuoteId },
      data: { status: "INVALIDATED" }
    })

    const totalCost = data.items.reduce((sum, item) => {
      return sum + (item.cpuCost + item.ramCost + item.storageCost + item.ipCost) * item.quantity
    }, 0)
    const sellingPrice = totalCost * (1 + data.profitMargin / 100)

    await prisma.quotation.create({
      data: {
        organizationId: user.organizationId,
        quoteGroupId: baseQuote.quoteGroupId,
        version: newVersion,
        customerId: data.customerId,
        createdById: user.id,
        expiryDate: new Date(data.expiryDate),
        totalCost,
        profitMargin: data.profitMargin,
        sellingPrice,
        firewallRequired: data.firewallRequired || false,
        activeDirectoryServer: data.activeDirectoryServer || false,
        rdpServer: data.rdpServer || false,
        cloudStorageRequiredGb: data.cloudStorageRequiredGb || 0,
        microsoftOs: data.microsoftOs || false,
        cPanel: data.cPanel || false,
        extraIpsCount: data.extraIpsCount || 0,
        items: {
          create: data.items.map((item) => ({
            vmNameLabel: item.vmNameLabel || null,
            cpuCores: item.cpuCores,
            ramGb: item.ramGb,
            storageGb: item.storageGb,
            quantity: item.quantity,
            cpuCost: item.cpuCost,
            ramCost: item.ramCost,
            storageCost: item.storageCost,
            ipCost: item.ipCost,
          }))
        }
      }
    })
    revalidatePath("/quotations")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to create quotation revision" }
  }
}

export async function updateQuotationStatus(id: string, status: QuoStatus) {
  try {
    await getOrgAndUser()
    await prisma.quotation.update({ where: { id }, data: { status } })
    revalidatePath("/quotations")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to update status" }
  }
}

export async function createPurchaseOrder(quotationId: string, customerId: string, poDate: string) {
  try {
    const user = await getOrgAndUser()
    const quotation = await prisma.quotation.findUnique({ where: { id: quotationId } })
    if (!quotation || quotation.status !== "ACCEPTED") {
      return { success: false, error: "Purchase Order can only be generated from an ACCEPTED quotation." }
    }

    const poNumber = `PO-${Date.now()}`
    await prisma.purchaseOrder.create({
      data: {
        organizationId: user.organizationId,
        poNumber,
        quotationId,
        customerId,
        poDate: new Date(poDate),
      }
    })
    revalidatePath("/quotations")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to create PO" }
  }
}

export async function updatePoContractStatus(id: string, contractStatus: import("@prisma/client").ContractStatus) {
  try {
    await getOrgAndUser()
    await prisma.purchaseOrder.update({ where: { id }, data: { contractStatus } })
    revalidatePath("/quotations")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to update PO contract status" }
  }
}
