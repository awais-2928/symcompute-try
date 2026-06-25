"use server"

import { auth } from "@/auth"
import { prisma } from "@/prisma/prisma"
import { revalidatePath } from "next/cache"
import { TaskStatus } from "@prisma/client"

async function getOrgAndUser() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { organizationId: true, id: true } })
  if (!user) throw new Error("Not found")
  return user
}

export async function createProvisioningTask(data: {
  poId: string
  customerId: string
  assignedServerId: string
  assignedEngineerId: string
}) {
  try {
    const user = await getOrgAndUser()
    await prisma.provisioningTask.create({
      data: {
        organizationId: user.organizationId,
        poId: data.poId,
        customerId: data.customerId,
        assignedServerId: data.assignedServerId,
        assignedEngineerId: data.assignedEngineerId,
      }
    })
    revalidatePath("/provisioning")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to create task" }
  }
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  try {
    await getOrgAndUser()
    await prisma.provisioningTask.update({
      where: { id },
      data: {
        status,
        completionDate: status === "COMPLETED" ? new Date() : null,
      }
    })
    revalidatePath("/provisioning")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to update task" }
  }
}

export async function assignEngineer(id: string, assignedEngineerId: string) {
  try {
    await getOrgAndUser()
    await prisma.provisioningTask.update({ where: { id }, data: { assignedEngineerId } })
    revalidatePath("/provisioning")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to assign engineer" }
  }
}
