"use server"

import { auth } from "@/auth"
import { prisma } from "@/prisma/prisma"
import { revalidatePath } from "next/cache"
import { ServerStatus, VirtualizationType } from "@prisma/client"

async function getOrgId() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { organizationId: true } })
  if (!user) throw new Error("User not found")
  return user.organizationId
}

export async function createServer(data: {
  serverName: string
  dataCenterName: string
  numCpus: number
  singleCpuCores: number
  ramGb: number
  storageGb: number
  monthlyRentalCost: number
  currency: string
  conversionRate: number
  oneTimeSetupCost: number
  ipSetupCost: number
  subscriptionStartDate: string
  subscriptionEndDate?: string
  status: ServerStatus
  virtualization: VirtualizationType
}) {
  try {
    const orgId = await getOrgId()
    const server = await prisma.bareMetalServer.create({
      data: {
        organizationId: orgId,
        ...data,
        monthlyRentalCost: data.monthlyRentalCost,
        conversionRate: data.conversionRate,
        oneTimeSetupCost: data.oneTimeSetupCost,
        ipSetupCost: data.ipSetupCost,
        subscriptionStartDate: new Date(data.subscriptionStartDate),
        subscriptionEndDate: data.subscriptionEndDate ? new Date(data.subscriptionEndDate) : null,
      },
    })
    revalidatePath("/servers")
    return { success: true, server }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to create server" }
  }
}

export async function updateServer(id: string, data: Partial<{
  serverName: string
  dataCenterName: string
  numCpus: number
  singleCpuCores: number
  ramGb: number
  storageGb: number
  monthlyRentalCost: number
  status: ServerStatus
  virtualization: VirtualizationType
}>) {
  try {
    await getOrgId()
    await prisma.bareMetalServer.update({ where: { id }, data })
    revalidatePath("/servers")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to update server" }
  }
}

export async function deleteServer(id: string) {
  try {
    await getOrgId()
    await prisma.bareMetalServer.update({ where: { id }, data: { deletedAt: new Date() } })
    revalidatePath("/servers")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to delete server" }
  }
}
