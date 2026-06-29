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
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")
    
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { organizationId: true } })
    if (!user) throw new Error("Not found")

    const vm = await prisma.vm.findUnique({ where: { id } })
    if (!vm) return { success: false, error: "VM not found" }

    await prisma.$transaction([
      prisma.vm.update({ where: { id }, data: { status } }),
      prisma.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: session.user.id,
          action: "UPDATE",
          entityName: "Vm",
          entityId: id,
          changes: { oldStatus: vm.status, newStatus: status }
        }
      })
    ])

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
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true }
    })
    if (!user) return { success: false, error: "User not found" }

    const vm = await prisma.vm.findUnique({ where: { id } })
    if (!vm) return { success: false, error: "VM not found" }
    if (vm.deletedAt) return { success: false, error: "VM is already deleted" }

    await prisma.$transaction([
      // Soft-delete the VM
      prisma.vm.update({
        where: { id },
        data: { deletedAt: new Date(), status: "DELETED" }
      }),
      // Release associated IPs
      prisma.ipAddress.updateMany({
        where: { vmId: id },
        data: { vmId: null, status: "FREE" }
      }),
      // Audit Log
      prisma.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: session.user.id,
          action: "DELETE",
          entityName: "Vm",
          entityId: id,
          changes: {
            reason: "VM Soft Deletion",
            cleanup: {
              ipsReleased: true
              // Note: ProvisioningTask cleanup omitted because vmId is not part of the ProvisioningTask schema
            }
          }
        }
      })
    ])

    revalidatePath("/vms")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to delete VM" }
  }
}

export async function getVmAuditLogs(vmId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) return []
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { organizationId: true } })
    if (!user) return []

    const logs = await prisma.auditLog.findMany({
      where: {
        organizationId: user.organizationId,
        entityName: "Vm",
        entityId: vmId
      },
      orderBy: { timestamp: "desc" }
    })
    
    return logs
  } catch (e) {
    console.error(e)
    return []
  }
}

export async function migrateVm(vmId: string, destServerId: string, reason?: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }

    const vm = await prisma.vm.findUnique({
      where: { id: vmId }
    })
    if (!vm) return { success: false, error: "VM not found" }
    if (vm.deletedAt) return { success: false, error: "Cannot migrate a deleted VM" }
    if (vm.serverId === destServerId) {
      return { success: false, error: "VM is already on the destination server" }
    }

    const destServer = await prisma.bareMetalServer.findUnique({
      where: { id: destServerId },
      include: {
        vms: {
          where: { deletedAt: null }
        }
      }
    })
    if (!destServer) return { success: false, error: "Destination server not found" }
    if (destServer.deletedAt) return { success: false, error: "Destination server is deleted" }

    const currentCpuUsed = destServer.vms.reduce((acc, v) => acc + v.cpuAllocated, 0)
    const currentRamUsed = destServer.vms.reduce((acc, v) => acc + v.ramAllocatedGb, 0)
    const currentStorageUsed = destServer.vms.reduce((acc, v) => acc + v.storageAllocatedGb, 0)

    const destTotalCpu = destServer.numCpus * destServer.singleCpuCores
    const destTotalRam = destServer.ramGb
    const destTotalStorage = destServer.storageGb

    if (currentCpuUsed + vm.cpuAllocated > destTotalCpu) {
      return {
        success: false,
        error: `Insufficient CPU capacity on destination server. Required: ${vm.cpuAllocated} cores, Available: ${destTotalCpu - currentCpuUsed} cores.`
      }
    }

    if (currentRamUsed + vm.ramAllocatedGb > destTotalRam) {
      return {
        success: false,
        error: `Insufficient RAM capacity on destination server. Required: ${vm.ramAllocatedGb} GB, Available: ${destTotalRam - currentRamUsed} GB.`
      }
    }

    if (currentStorageUsed + vm.storageAllocatedGb > destTotalStorage) {
      return {
        success: false,
        error: `Insufficient Storage capacity on destination server. Required: ${vm.storageAllocatedGb} GB, Available: ${destTotalStorage - currentStorageUsed} GB.`
      }
    }

    await prisma.$transaction([
      prisma.vm.update({
        where: { id: vmId },
        data: { serverId: destServerId }
      }),
      prisma.vmMigration.create({
        data: {
          vmId,
          sourceServerId: vm.serverId,
          destServerId,
          reason: reason || "Standard Migration"
        }
      }),
      prisma.auditLog.create({
        data: {
          organizationId: vm.organizationId,
          userId: session.user.id,
          action: "UPDATE",
          entityName: "Vm",
          entityId: vmId,
          changes: {
            action: "MIGRATE",
            sourceServerId: vm.serverId,
            destServerId,
            reason
          }
        }
      })
    ])

    revalidatePath("/vms")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to migrate VM" }
  }
}
