"use server"

import { auth } from "@/auth"
import { prisma } from "@/prisma/prisma"
import { revalidatePath } from "next/cache"
import { VmStatus } from "@prisma/client"

async function getOrgId() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { organizationId: true } })
  if (!user) throw new Error("Not found")
  return user.organizationId
}

export async function createVm(data: {
  serverId: string
  customerId: string
  vmName?: string
  cpuAllocated: number
  ramAllocatedGb: number
  storageAllocatedGb: number
  status: VmStatus
}) {
  try {
    const orgId = await getOrgId()
    await prisma.vm.create({ data: { organizationId: orgId, ...data } })
    revalidatePath("/vms")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to create VM" }
  }
}

export async function updateVmStatus(id: string, status: VmStatus) {
  try {
    await getOrgId()
    await prisma.vm.update({ where: { id }, data: { status } })
    revalidatePath("/vms")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to update VM" }
  }
}

export async function upgradeVm(id: string, data: {
  cpuAllocated: number
  ramAllocatedGb: number
  storageAllocatedGb: number
}) {
  try {
    await getOrgId()
    const vm = await prisma.vm.findUnique({ where: { id } })
    if (!vm) return { success: false, error: "VM not found" }
    
    await prisma.$transaction([
      prisma.vmUpgradeHistory.create({
        data: {
          vmId: id,
          oldCpu: vm.cpuAllocated,
          newCpu: data.cpuAllocated,
          oldRamGb: vm.ramAllocatedGb,
          newRamGb: data.ramAllocatedGb,
          oldStorageGb: vm.storageAllocatedGb,
          newStorageGb: data.storageAllocatedGb,
        }
      }),
      prisma.vm.update({ where: { id }, data })
    ])
    revalidatePath("/vms")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to upgrade VM" }
  }
}

export async function deleteVm(id: string) {
  try {
    await getOrgId()
    await prisma.vm.update({ where: { id }, data: { deletedAt: new Date(), status: "DELETED" } })
    revalidatePath("/vms")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to delete VM" }
  }
}
