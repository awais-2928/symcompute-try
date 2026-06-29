"use server"

import { auth } from "@/auth"
import { prisma } from "@/prisma/prisma"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

async function getOrgId() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { organizationId: true } })
  if (!user) throw new Error("Not found")
  return user.organizationId
}

export async function createStaff(data: {
  name: string
  email: string
  password: string
  roleId: string
}) {
  try {
    const orgId = await getOrgId()
    
    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) return { success: false, error: "Email already exists" }

    const hashedPassword = await bcrypt.hash(data.password, 12)
    const newUser = await prisma.user.create({
      data: {
        organizationId: orgId,
        email: data.email,
        name: data.name,
        password: hashedPassword,
        isActive: true,
      }
    })
    
    await prisma.userRoleAssignment.create({
      data: { userId: newUser.id, roleId: data.roleId }
    })
    
    revalidatePath("/staff")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to create staff member" }
  }
}

export async function toggleStaffStatus(id: string, isActive: boolean) {
  try {
    await getOrgId()
    await prisma.user.update({ where: { id }, data: { isActive } })
    revalidatePath("/staff")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to update status" }
  }
}

export async function assignRoleToUser(userId: string, roleId: string) {
  try {
    await getOrgId()
    // Remove existing roles
    await prisma.userRoleAssignment.deleteMany({ where: { userId } })
    // Add new role
    await prisma.userRoleAssignment.create({ data: { userId, roleId } })
    revalidatePath("/staff")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to assign role" }
  }
}

export async function resetPassword(id: string, newPassword: string) {
  try {
    await getOrgId()
    const hashed = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({ where: { id }, data: { password: hashed } })
    revalidatePath("/staff")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to reset password" }
  }
}

export async function deleteStaff(id: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }

    // Check if current user is Super Admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { roleAssignments: { include: { role: true } } }
    })
    
    if (!currentUser) return { success: false, error: "User not found" }
    
    const isSuperAdmin = currentUser.roleAssignments.some(ra => ra.role.name === "Super Admin")
    if (!isSuperAdmin) {
      return { success: false, error: "Only Super Admin can delete staff members" }
    }

    // Protect the Super Admin itself from being deleted
    const userToDelete = await prisma.user.findUnique({
      where: { id },
      include: { roleAssignments: { include: { role: true } } }
    })
    
    if (!userToDelete) return { success: false, error: "Staff member not found" }
    
    const deletingSuperAdmin = userToDelete.roleAssignments.some(ra => ra.role.name === "Super Admin")
    if (deletingSuperAdmin) {
      return { success: false, error: "Cannot delete a Super Admin staff member" }
    }

    if (id === session.user.id) {
      return { success: false, error: "Cannot delete your own account" }
    }

    // Soft delete the user
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() }
    })

    revalidatePath("/staff")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to delete staff member" }
  }
}
