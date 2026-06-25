"use client"

import { useState } from "react"
import { Plus, Edit2, Trash2, KeyRound, Search, Users, Shield } from "lucide-react"
import { createRole, updateRole, deleteRole, updateRolePermissions } from "./actions"
import type { Role, RolePermission, Permission } from "@prisma/client"

type RoleWithRelations = Role & {
  _count: { users: number }
  permissions: (RolePermission & { permission: Permission })[]
}

export default function RolesClient({ roles: initial }: { roles: RoleWithRelations[] }) {
  const [roles, setRoles] = useState(initial)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<RoleWithRelations | null>(null)
  const [roleName, setRoleName] = useState("")
  const [loading, setLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showPermissions, setShowPermissions] = useState<RoleWithRelations | null>(null)
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)
  const [error, setError] = useState("")

  const modules = ["staff", "roles", "customers", "quotations", "vms", "ips", "servers", "provisioning", "invoices"]
  const actions = ["view", "create", "edit", "delete"]

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const openCreate = () => {
    setEditing(null)
    setRoleName("")
    setError("")
    setShowModal(true)
  }

  const openEdit = (role: RoleWithRelations) => {
    setEditing(role)
    setRoleName(role.name)
    setError("")
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!roleName.trim()) {
      setError("Role name is required")
      return
    }
    setLoading(true)
    const result = editing
      ? await updateRole(editing.id, roleName.trim())
      : await createRole(roleName.trim())

    if (result.success) {
      showToast(editing ? "Role updated" : "Role created", "success")
      setShowModal(false)
      window.location.reload()
    } else {
      setError(result.error || "Failed")
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const role = roles.find((r) => r.id === deleteId)
    if (role && role._count.users > 0) {
      showToast("Cannot delete a role that has users assigned to it", "error")
      setDeleteId(null)
      return
    }
    const result = await deleteRole(deleteId)
    if (result.success) {
      setRoles((prev) => prev.filter((r) => r.id !== deleteId))
      showToast("Role deleted", "success")
    } else {
      showToast(result.error || "Failed", "error")
    }
    setDeleteId(null)
  }

  const openPermissions = (role: RoleWithRelations) => {
    setShowPermissions(role)
    const currentPerms = new Set(role.permissions.map(rp => rp.permission.action))
    setSelectedPerms(currentPerms)
  }

  const handleSavePermissions = async () => {
    if (!showPermissions) return
    setLoading(true)
    const result = await updateRolePermissions(showPermissions.id, Array.from(selectedPerms))
    if (result.success) {
      showToast("Permissions updated", "success")
      setShowPermissions(null)
      window.location.reload()
    } else {
      showToast(result.error || "Failed", "error")
    }
    setLoading(false)
  }

  const protectedRoles = ["Super Admin"]
  const filtered = roles.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg ${toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search roles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Plus size={14} />
          Create Role
        </button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-slate-400">
            <KeyRound size={40} className="mx-auto mb-3 opacity-30" />
            <p>No roles found</p>
          </div>
        ) : (
          filtered.map((role) => {
            const isProtected = protectedRoles.includes(role.name)
            return (
              <div key={role.id} className="stat-card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <KeyRound size={14} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{role.name}</h3>
                      {isProtected && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">System</span>
                      )}
                    </div>
                  </div>
                  {!isProtected && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => openPermissions(role)} className="p-1.5 hover:bg-emerald-50 rounded text-emerald-600" title="Permissions">
                        <Shield size={13} />
                      </button>
                      <button onClick={() => openEdit(role)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="Edit Name">
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteId(role.id)}
                        className={`p-1.5 hover:bg-red-50 rounded text-red-600 ${role._count.users > 0 ? "opacity-40 cursor-not-allowed" : ""}`}
                        title={role._count.users > 0 ? "Cannot delete role with users" : "Delete"}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Users size={13} />
                  <span>{role._count.users} user{role._count.users !== 1 ? "s" : ""} assigned</span>
                </div>
                {role.permissions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {role.permissions.slice(0, 3).map((rp) => (
                      <span key={rp.permissionId} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {rp.permission.action}
                      </span>
                    ))}
                    {role.permissions.length > 3 && (
                      <span className="text-xs text-slate-400">+{role.permissions.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
            <div className="p-6 border-b border-slate-100">
              <h2 className="font-bold text-slate-900" style={{ fontFamily: "Sora, sans-serif" }}>
                {editing ? "Edit Role" : "Create Role"}
              </h2>
            </div>
            <div className="p-6">
              <label className="form-label">Role Name *</label>
              <input
                type="text"
                value={roleName}
                onChange={(e) => { setRoleName(e.target.value); setError("") }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="e.g., Network Engineer"
                autoFocus
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg">Cancel</button>
              <button onClick={handleSubmit} disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">
                {loading ? "Saving..." : editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permission Matrix Modal */}
      {showPermissions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-slate-900" style={{ fontFamily: "Sora, sans-serif" }}>
                  Permission Assignment
                </h2>
                <p className="text-sm text-slate-500">Managing access for: <span className="font-semibold text-slate-700">{showPermissions.name}</span></p>
              </div>
              <button onClick={() => setShowPermissions(null)} className="text-slate-400 hover:text-slate-600 text-sm">Close</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border-b-2 border-slate-200 pb-3 font-semibold text-slate-600 w-1/3">Module</th>
                    {actions.map(action => (
                      <th key={action} className="border-b-2 border-slate-200 pb-3 font-semibold text-slate-600 text-center capitalize w-1/6">
                        {action}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modules.map((mod) => (
                    <tr key={mod} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 font-medium text-slate-800 capitalize">{mod}</td>
                      {actions.map(action => {
                        const permString = `${mod}:${action}`
                        const isChecked = selectedPerms.has(permString)
                        return (
                          <td key={action} className="py-3 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const next = new Set(selectedPerms)
                                if (e.target.checked) next.add(permString)
                                else next.delete(permString)
                                setSelectedPerms(next)
                              }}
                              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-xl">
              <button onClick={() => setShowPermissions(null)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-white">Cancel</button>
              <button onClick={handleSavePermissions} disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {loading ? "Saving..." : "Save Permissions"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 shadow-2xl max-w-sm mx-4">
            <h3 className="font-bold text-slate-900 mb-2">Delete Role?</h3>
            <p className="text-sm text-slate-500 mb-6">This role will be permanently removed.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
