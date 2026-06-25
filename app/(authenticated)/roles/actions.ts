"use server"

import { auth } from "@/auth"
import { prisma } from "@/prisma/prisma"
import { revalidatePath } from "next/cache"

async function getOrgId() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { organizationId: true } })
  if (!user) throw new Error("Not found")
  return user.organizationId
}

export async function createRole(name: string) {
  try {
    const orgId = await getOrgId()
    const existing = await prisma.role.findFirst({
      where: { organizationId: orgId, name: { equals: name, mode: "insensitive" }, deletedAt: null }
    })
    if (existing) return { success: false, error: "A role with this name already exists" }
    await prisma.role.create({ data: { organizationId: orgId, name } })
    revalidatePath("/roles")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to create role" }
  }
}

export async function updateRole(id: string, name: string) {
  try {
    const orgId = await getOrgId()
    const roleToUpdate = await prisma.role.findUnique({ where: { id } })
    if (roleToUpdate?.name === "Super Admin") {
      return { success: false, error: "Cannot modify the Super Admin system role" }
    }

    const existing = await prisma.role.findFirst({
      where: { organizationId: orgId, name: { equals: name, mode: "insensitive" }, deletedAt: null, NOT: { id } }
    })
    if (existing) return { success: false, error: "A role with this name already exists" }
    await prisma.role.update({ where: { id }, data: { name } })
    revalidatePath("/roles")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to update role" }
  }
}

export async function deleteRole(id: string) {
  try {
    await getOrgId()
    const roleToDelete = await prisma.role.findUnique({ where: { id } })
    if (roleToDelete?.name === "Super Admin") {
      return { success: false, error: "Cannot delete the Super Admin system role" }
    }

    await prisma.role.update({ where: { id }, data: { deletedAt: new Date() } })
    revalidatePath("/roles")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to delete role" }
  }
}

export async function updateRolePermissions(roleId: string, actions: string[]) {
  try {
    await getOrgId()
    const role = await prisma.role.findUnique({ where: { id: roleId } })
    if (role?.name === "Super Admin") {
      return { success: false, error: "Cannot modify permissions for Super Admin" }
    }

    for (const act of actions) {
      const perm = await prisma.permission.findFirst({ where: { action: act } })
      if (!perm) {
        await prisma.permission.create({ data: { action: act, description: `Permission for ${act}` } })
      }
    }

    const perms = await prisma.permission.findMany({ where: { action: { in: actions } } })
    
    await prisma.rolePermission.deleteMany({ where: { roleId } })
    
    if (perms.length > 0) {
      await prisma.rolePermission.createMany({
        data: perms.map(p => ({ roleId, permissionId: p.id }))
      })
    }

    revalidatePath("/roles")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to update permissions" }
  }
}
