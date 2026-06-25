"use server"

import { auth } from "@/auth"
import { prisma } from "@/prisma/prisma"
import { revalidatePath } from "next/cache"
import { IpStatus } from "@prisma/client"

async function getOrgId() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { organizationId: true } })
  if (!user) throw new Error("Not found")
  return user.organizationId
}

export async function createIpAddress(data: {
  ipAddress: string
  serverId: string
  vmId?: string
  status: IpStatus
}) {
  try {
    await getOrgId()
    await prisma.ipAddress.create({ data: { ...data, vmId: data.vmId || null } })
    revalidatePath("/ip-addresses")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to create IP address" }
  }
}

export async function assignIpToVm(ipAddress: string, vmId: string | null) {
  try {
    await getOrgId()
    await prisma.ipAddress.update({
      where: { ipAddress },
      data: { vmId: vmId || null, status: vmId ? "ASSIGNED" : "FREE" }
    })
    revalidatePath("/ip-addresses")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to assign IP" }
  }
}

export async function deleteIpAddress(ipAddress: string) {
  try {
    await getOrgId()
    await prisma.ipAddress.update({ where: { ipAddress }, data: { deletedAt: new Date() } })
    revalidatePath("/ip-addresses")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to delete IP" }
  }
}
