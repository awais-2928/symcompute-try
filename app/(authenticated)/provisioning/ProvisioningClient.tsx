"use client"

import { useState } from "react"
import { Plus, Briefcase, Search } from "lucide-react"
import { createProvisioningTask, updateTaskStatus, assignEngineer } from "./actions"
import type { ProvisioningTask, TaskStatus, PurchaseOrder, Customer, BareMetalServer } from "@prisma/client"

type TaskWithRelations = ProvisioningTask & {
  po: PurchaseOrder
  customer: { companyName: string }
  engineer: { name: string } | null
  server: { serverName: string }
}

type StaffOption = { id: string; name: string }
type PoOption = PurchaseOrder
type CustomerOption = Customer
type ServerOption = BareMetalServer

const TASK_STATUSES: TaskStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED"]

export default function ProvisioningClient({
  tasks: initial,
  staff,
  purchaseOrders,
  customers,
  servers,
}: {
  tasks: TaskWithRelations[]
  staff: StaffOption[]
  purchaseOrders: PoOption[]
  customers: CustomerOption[]
  servers: ServerOption[]
}) {
  const [tasks, setTasks] = useState(initial)
  const [search, setSearch] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [completingTask, setCompletingTask] = useState<TaskWithRelations | null>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)
  const [createForm, setCreateForm] = useState({
    poId: "",
    customerId: "",
    assignedServerId: "",
    assignedEngineerId: "",
  })

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleCreate = async () => {
    if (!createForm.poId || !createForm.customerId || !createForm.assignedServerId || !createForm.assignedEngineerId) {
      showToast("All fields are required", "error")
      return
    }
    setLoading(true)
    const result = await createProvisioningTask(createForm)
    if (result.success) {
      showToast("Task created", "success")
      setShowCreate(false)
      window.location.reload()
    } else {
      showToast(result.error || "Failed", "error")
    }
    setLoading(false)
  }

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    if (status === "COMPLETED") {
      const task = tasks.find((t) => t.id === id)
      setCompletingTask(task || null)
      return
    }
    const result = await updateTaskStatus(id, status)
    if (result.success) {
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status } as TaskWithRelations : t))
      showToast("Status updated", "success")
    }
  }

  const handleComplete = async () => {
    if (!completingTask) return
    const result = await updateTaskStatus(completingTask.id, "COMPLETED")
    if (result.success) {
      setTasks((prev) => prev.map((t) => t.id === completingTask.id ? { ...t, status: "COMPLETED" } as TaskWithRelations : t))
      showToast("Task marked as completed", "success")
    }
    setCompletingTask(null)
  }

  const handleAssignEngineer = async (taskId: string, engineerId: string) => {
    const result = await assignEngineer(taskId, engineerId)
    if (result.success) {
      const eng = staff.find((s) => s.id === engineerId)
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, engineer: eng || null } as TaskWithRelations : t))
    }
  }

  // Stats
  const pending = tasks.filter((t) => t.status === "PENDING").length
  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length
  const completed = tasks.filter((t) => t.status === "COMPLETED").length

  const filtered = tasks.filter((t) =>
    t.customer.companyName.toLowerCase().includes(search.toLowerCase()) ||
    t.server.serverName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg ${toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          { label: "Pending", count: pending, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "In Progress", count: inProgress, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Completed", count: completed, color: "text-green-600", bg: "bg-green-50" },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className="stat-card flex items-center gap-3">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
              <Briefcase size={18} className={color} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{count}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Plus size={14} />
          New Task
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>PO #</th>
              <th>Server</th>
              <th>Engineer</th>
              <th>Status</th>
              <th>Created Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400">
                  <Briefcase size={32} className="mx-auto mb-2 opacity-30" />
                  <p>No provisioning tasks found</p>
                </td>
              </tr>
            ) : (
              filtered.map((task) => {
                return (
                  <tr key={task.id}>
                    <td>
                      <div className="font-medium text-slate-900">{task.customer.companyName}</div>
                    </td>
                    <td>
                      <div className="text-xs font-mono text-slate-400">{task.po.poNumber}</div>
                    </td>
                    <td>
                      <div className="text-sm text-slate-700">{task.server.serverName}</div>
                    </td>
                    <td>
                      <select
                        value={task.assignedEngineerId || ""}
                        onChange={(e) => handleAssignEngineer(task.id, e.target.value)}
                        className="text-xs px-2 py-1 rounded border border-slate-200 bg-white max-w-32"
                      >
                        <option value="">Unassigned</option>
                        {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </td>
                    <td>
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                        className="text-xs px-2 py-1 rounded border border-slate-200 bg-white"
                      >
                        {TASK_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                      </select>
                    </td>
                    <td className="text-xs text-slate-500 max-w-xs truncate">
                      {new Date(task.createdDate).toLocaleDateString()}
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
              <h2 className="font-bold text-slate-900" style={{ fontFamily: "Sora, sans-serif" }}>Create Provisioning Task</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">Purchase Order *</label>
                <select value={createForm.poId} onChange={(e) => setCreateForm((f) => ({ ...f, poId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select PO...</option>
                  {purchaseOrders.map((po) => (
                    <option key={po.id} value={po.id}>{po.poNumber}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Customer *</label>
                <select value={createForm.customerId} onChange={(e) => setCreateForm((f) => ({ ...f, customerId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Server *</label>
                <select value={createForm.assignedServerId} onChange={(e) => setCreateForm((f) => ({ ...f, assignedServerId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Server...</option>
                  {servers.map((s) => (
                    <option key={s.id} value={s.id}>{s.serverName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Assign Engineer *</label>
                <select value={createForm.assignedEngineerId} onChange={(e) => setCreateForm((f) => ({ ...f, assignedEngineerId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Unassigned</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg">Cancel</button>
              <button onClick={handleCreate} disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">
                {loading ? "Creating..." : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {completingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-slate-100">
              <h2 className="font-bold text-slate-900" style={{ fontFamily: "Sora, sans-serif" }}>Mark Task as Completed</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600">Are you sure you want to mark this task as completed?</p>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setCompletingTask(null)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg">Cancel</button>
              <button onClick={handleComplete} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg">
                Mark Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
