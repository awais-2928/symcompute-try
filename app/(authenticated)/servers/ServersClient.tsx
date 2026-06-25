"use client"

import { useState } from "react"
import { Plus, Edit2, Trash2, Server, Search } from "lucide-react"
import { createServer, updateServer, deleteServer } from "./actions"
import type { BareMetalServer, ServerStatus, VirtualizationType } from "@prisma/client"

type ServerWithCounts = BareMetalServer & {
  _count: { vms: number; ips: number }
}

const statusColors: Record<ServerStatus, string> = {
  ACTIVE: "badge-active",
  INACTIVE: "badge-inactive",
  MAINTENANCE: "badge-maintenance",
}

const virtLabels: Record<VirtualizationType, string> = {
  NONE: "None",
  VMWARE_ESXI: "VMware ESXi",
  HYPER_V: "Hyper-V",
  KVM: "KVM",
  XEN: "XEN",
  PROXMOX: "Proxmox",
  OPENSHIFT: "OpenShift",
  CITRIX: "Citrix",
}

const STATUSES: ServerStatus[] = ["ACTIVE", "INACTIVE", "MAINTENANCE"]
const VIRT_TYPES: VirtualizationType[] = ["NONE", "VMWARE_ESXI", "HYPER_V", "KVM", "XEN", "PROXMOX", "OPENSHIFT", "CITRIX"]

interface FormData {
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
  subscriptionEndDate: string
  status: ServerStatus
  virtualization: VirtualizationType
}

const emptyForm: FormData = {
  serverName: "",
  dataCenterName: "",
  numCpus: 1,
  singleCpuCores: 8,
  ramGb: 32,
  storageGb: 500,
  monthlyRentalCost: 0,
  currency: "USD",
  conversionRate: 1,
  oneTimeSetupCost: 0,
  ipSetupCost: 0,
  subscriptionStartDate: new Date().toISOString().split("T")[0],
  subscriptionEndDate: "",
  status: "ACTIVE",
  virtualization: "NONE",
}

export default function ServersClient({ servers: initialServers }: { servers: ServerWithCounts[] }) {
  const [servers, setServers] = useState(initialServers)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<ServerWithCounts | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (server: ServerWithCounts) => {
    setEditing(server)
    setForm({
      serverName: server.serverName,
      dataCenterName: server.dataCenterName,
      numCpus: server.numCpus,
      singleCpuCores: server.singleCpuCores,
      ramGb: server.ramGb,
      storageGb: server.storageGb,
      monthlyRentalCost: Number(server.monthlyRentalCost),
      currency: server.currency,
      conversionRate: Number(server.conversionRate),
      oneTimeSetupCost: Number(server.oneTimeSetupCost),
      ipSetupCost: Number(server.ipSetupCost),
      subscriptionStartDate: server.subscriptionStartDate.toISOString().split("T")[0],
      subscriptionEndDate: server.subscriptionEndDate?.toISOString().split("T")[0] || "",
      status: server.status,
      virtualization: server.virtualization,
    })
    setShowModal(true)
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      if (editing) {
        const result = await updateServer(editing.id, {
          serverName: form.serverName,
          dataCenterName: form.dataCenterName,
          numCpus: form.numCpus,
          singleCpuCores: form.singleCpuCores,
          ramGb: form.ramGb,
          storageGb: form.storageGb,
          monthlyRentalCost: form.monthlyRentalCost,
          status: form.status,
          virtualization: form.virtualization,
        })
        if (result.success) {
          showToast("Server updated successfully", "success")
          setShowModal(false)
          window.location.reload()
        } else {
          showToast(result.error || "Failed", "error")
        }
      } else {
        const result = await createServer({
          ...form,
          subscriptionEndDate: form.subscriptionEndDate || undefined,
        })
        if (result.success) {
          showToast("Server created successfully", "success")
          setShowModal(false)
          window.location.reload()
        } else {
          showToast(result.error || "Failed", "error")
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const result = await deleteServer(deleteId)
    if (result.success) {
      setServers((prev) => prev.filter((s) => s.id !== deleteId))
      showToast("Server deleted", "success")
    } else {
      showToast("Failed to delete", "error")
    }
    setDeleteId(null)
  }

  const filtered = servers.filter(
    (s) =>
      s.serverName.toLowerCase().includes(search.toLowerCase()) ||
      s.dataCenterName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg ${
            toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search servers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} />
          Add Server
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Server Name</th>
              <th>Data Center</th>
              <th>Specs</th>
              <th>Virtualization</th>
              <th>Monthly Cost</th>
              <th>VMs</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400">
                  <Server size={32} className="mx-auto mb-2 opacity-30" />
                  <p>No servers found</p>
                </td>
              </tr>
            ) : (
              filtered.map((server) => (
                <tr key={server.id}>
                  <td>
                    <div className="font-medium text-slate-900">{server.serverName}</div>
                  </td>
                  <td className="text-slate-600">{server.dataCenterName}</td>
                  <td>
                    <div className="text-xs text-slate-600">
                      <div>{server.numCpus}× {server.singleCpuCores}C CPU</div>
                      <div>{server.ramGb}GB RAM · {server.storageGb}GB SSD</div>
                    </div>
                  </td>
                  <td className="text-sm text-slate-600">{virtLabels[server.virtualization]}</td>
                  <td className="font-medium text-slate-900">
                    {server.currency} {Number(server.monthlyRentalCost).toLocaleString()}
                  </td>
                  <td className="text-center">
                    <span className="badge badge-provisioned">{server._count.vms}</span>
                  </td>
                  <td>
                    <span className={`badge ${statusColors[server.status]}`}>
                      {server.status.toLowerCase()}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(server)}
                        className="p-1.5 hover:bg-blue-50 rounded text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteId(server.id)}
                        className="p-1.5 hover:bg-red-50 rounded text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <h2 className="font-bold text-slate-900" style={{ fontFamily: "Sora, sans-serif" }}>
                {editing ? "Edit Server" : "Add New Server"}
              </h2>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {[
                { label: "Server Name", key: "serverName", type: "text" },
                { label: "Data Center", key: "dataCenterName", type: "text" },
                { label: "Number of CPUs", key: "numCpus", type: "number" },
                { label: "Cores per CPU", key: "singleCpuCores", type: "number" },
                { label: "RAM (GB)", key: "ramGb", type: "number" },
                { label: "Storage (GB)", key: "storageGb", type: "number" },
                { label: "Monthly Rental Cost", key: "monthlyRentalCost", type: "number" },
                { label: "Currency", key: "currency", type: "text" },
                { label: "Conversion Rate", key: "conversionRate", type: "number" },
                { label: "One-Time Setup Cost", key: "oneTimeSetupCost", type: "number" },
                { label: "IP Setup Cost", key: "ipSetupCost", type: "number" },
                { label: "Start Date", key: "subscriptionStartDate", type: "date" },
                { label: "End Date (optional)", key: "subscriptionEndDate", type: "date" },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="form-label">{label}</label>
                  <input
                    type={type}
                    value={(form as unknown as Record<string, string | number>)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}

              <div>
                <label className="form-label">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ServerStatus }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="form-label">Virtualization</label>
                <select
                  value={form.virtualization}
                  onChange={(e) => setForm((f) => ({ ...f, virtualization: e.target.value as VirtualizationType }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {VIRT_TYPES.map((v) => <option key={v} value={v}>{virtLabels[v]}</option>)}
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Saving..." : editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 shadow-2xl max-w-sm mx-4">
            <h3 className="font-bold text-slate-900 mb-2">Delete Server?</h3>
            <p className="text-sm text-slate-500 mb-6">
              This will mark the server as deleted. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
