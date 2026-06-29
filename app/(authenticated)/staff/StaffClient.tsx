"use client"

import { useState, useEffect } from "react"
import { Plus, Settings2, Search, ToggleLeft, ToggleRight, Key, Trash2 } from "lucide-react"
import { createStaff, toggleStaffStatus, assignRoleToUser, resetPassword, deleteStaff } from "./actions"
import type { User, UserRoleAssignment } from "@prisma/client"

type StaffWithRoles = User & {
  roleAssignments: (UserRoleAssignment & { role: { id: string; name: string } })[]
}
type RoleOption = { id: string; name: string }

export default function StaffClient({
  staff: initial,
  roles,
  currentUserId,
}: {
  staff: StaffWithRoles[]
  roles: RoleOption[]
  currentUserId: string
}) {
  const [staff, setStaff] = useState(initial)
  
  useEffect(() => {
    setStaff(initial)
  }, [initial])

  const [search, setSearch] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [resetFor, setResetFor] = useState<StaffWithRoles | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    roleId: "",
  })
  const [createError, setCreateError] = useState("")

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleCreate = async () => {
    if (!createForm.name || !createForm.email || !createForm.password || !createForm.roleId) {
      setCreateError("All fields are required")
      return
    }
    setLoading(true)
    const result = await createStaff(createForm)
    if (result.success) {
      showToast("Staff member created", "success")
      setShowCreate(false)
      window.location.reload()
    } else {
      setCreateError(result.error || "Failed")
    }
    setLoading(false)
  }

  const handleToggleStatus = async (member: StaffWithRoles) => {
    if (member.id === currentUserId) {
      showToast("Cannot deactivate your own account", "error")
      return
    }
    const result = await toggleStaffStatus(member.id, !member.isActive)
    if (result.success) {
      setStaff((prev) => prev.map((s) => s.id === member.id ? { ...s, isActive: !member.isActive } : s))
    }
  }

  const handleRoleChange = async (userId: string, roleId: string) => {
    const result = await assignRoleToUser(userId, roleId)
    if (result.success) {
      const role = roles.find((r) => r.id === roleId)
      setStaff((prev) => prev.map((s) => s.id === userId ? {
        ...s,
        roleAssignments: [{ id: "", userId, roleId, role: role || { id: roleId, name: "—" } }]
      } : s))
      showToast("Role updated", "success")
    }
  }

  const handleResetPassword = async () => {
    if (!resetFor || !newPassword) return
    const result = await resetPassword(resetFor.id, newPassword)
    if (result.success) {
      showToast("Password reset successfully", "success")
      setResetFor(null)
      setNewPassword("")
    } else {
      showToast(result.error || "Failed", "error")
    }
  }

  const handleDeleteStaff = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this staff member?")) return
    setLoading(true)
    const result = await deleteStaff(id)
    if (result.success) {
      showToast("Staff member deleted successfully", "success")
    } else {
      showToast(result.error || "Failed to delete staff member", "error")
    }
    setLoading(false)
  }

  const filtered = staff.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  )

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
            placeholder="Search staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Plus size={14} />
          Add Staff
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400">
                  <Settings2 size={32} className="mx-auto mb-2 opacity-30" />
                  <p>No staff members found</p>
                </td>
              </tr>
            ) : (
              filtered.map((member) => {
                const currentRole = member.roleAssignments[0]?.role
                const isCurrentUser = member.id === currentUserId
                return (
                  <tr key={member.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{member.name}</div>
                          {isCurrentUser && <div className="text-xs text-blue-600">You</div>}
                        </div>
                      </div>
                    </td>
                    <td className="text-sm text-slate-600">{member.email}</td>
                    <td>
                      <select
                        value={currentRole?.id || ""}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        disabled={isCurrentUser}
                        className="text-xs px-2 py-1 rounded border border-slate-200 bg-white disabled:opacity-50"
                      >
                        <option value="">No role</option>
                        {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleStatus(member)}
                        disabled={isCurrentUser}
                        className={`flex items-center gap-1 text-xs disabled:opacity-40 ${member.isActive ? "text-green-600" : "text-slate-400"}`}
                        title={isCurrentUser ? "Cannot deactivate own account" : undefined}
                      >
                        {member.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        {member.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="text-sm text-slate-500">{new Date(member.createdAt).toLocaleDateString()}</td>
                    <td className="flex items-center gap-2">
                      <button
                        onClick={() => { setResetFor(member); setNewPassword("") }}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 border border-slate-200 rounded hover:bg-slate-50"
                        title="Reset password"
                      >
                        <Key size={11} />
                        Reset Password
                      </button>

                      {!isCurrentUser && currentRole?.name !== "Super Admin" && (
                        <button
                          onClick={() => handleDeleteStaff(member.id)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50"
                          title="Delete staff member"
                        >
                          <Trash2 size={11} />
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-slate-100">
              <h2 className="font-bold text-slate-900" style={{ fontFamily: "Sora, sans-serif" }}>Add Staff Member</h2>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: "Full Name *", key: "name", type: "text" },
                { label: "Email *", key: "email", type: "email" },
                { label: "Password *", key: "password", type: "password" },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="form-label">{label}</label>
                  <input type={type} value={(createForm as Record<string, string>)[key]}
                    onChange={(e) => { setCreateForm((f) => ({ ...f, [key]: e.target.value })); setCreateError("") }}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div>
                <label className="form-label">Role *</label>
                <select value={createForm.roleId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, roleId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select role...</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              {createError && <p className="text-red-500 text-xs">{createError}</p>}
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg">Cancel</button>
              <button onClick={handleCreate} disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">
                {loading ? "Creating..." : "Create Staff"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
            <div className="p-6 border-b border-slate-100">
              <h2 className="font-bold text-slate-900" style={{ fontFamily: "Sora, sans-serif" }}>Reset Password</h2>
              <p className="text-sm text-slate-500 mt-1">{resetFor.name}</p>
            </div>
            <div className="p-6">
              <label className="form-label">New Password</label>
              <input type="password" value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setResetFor(null)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg">Cancel</button>
              <button onClick={handleResetPassword} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg">Reset</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
