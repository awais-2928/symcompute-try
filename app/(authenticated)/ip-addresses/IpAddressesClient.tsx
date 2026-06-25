"use client"

import { useState } from "react"
import { Plus, Trash2, Network, Search, Link, Unlink } from "lucide-react"
import { createIpAddress, assignIpToVm, deleteIpAddress } from "./actions"
import type { IpAddress, IpStatus, BareMetalServer, Vm } from "@prisma/client"

type IpWithRelations = IpAddress & {
  server: { serverName: string }
  vm: { vmName: string | null; customer: { companyName: string } } | null
}

type ServerOption = Pick<BareMetalServer, "id" | "serverName">
type VmOption = Pick<Vm, "id" | "vmName"> & { customer: { companyName: string } }

const IP_STATUSES: IpStatus[] = ["FREE", "ASSIGNED", "RESERVED"]

const statusColors: Record<IpStatus, string> = {
  FREE: "badge-free",
  ASSIGNED: "badge-assigned",
  RESERVED: "badge-reserved",
}

export default function IpAddressesClient({
  ipAddresses: initial,
  servers,
  vms,
}: {
  ipAddresses: IpWithRelations[]
  servers: ServerOption[]
  vms: VmOption[]
}) {
  const [ips, setIps] = useState(initial)
  const [search, setSearch] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [assignIp, setAssignIp] = useState<IpWithRelations | null>(null)
  const [selectedVmId, setSelectedVmId] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)
  const [createForm, setCreateForm] = useState({
    ipAddress: "",
    serverId: "",
    vmId: "",
    status: "FREE" as IpStatus,
  })

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleCreate = async () => {
    if (!createForm.ipAddress || !createForm.serverId) {
      showToast("IP address and server are required", "error")
      return
    }
    setLoading(true)
    const result = await createIpAddress({ ...createForm, vmId: createForm.vmId || undefined })
    if (result.success) {
      showToast("IP address created", "success")
      setShowCreate(false)
      window.location.reload()
    } else {
      showToast(result.error || "Failed", "error")
    }
    setLoading(false)
  }

  const handleAssign = async () => {
    if (!assignIp) return
    const result = await assignIpToVm(assignIp.ipAddress, selectedVmId || null)
    if (result.success) {
      showToast(selectedVmId ? "IP assigned to VM" : "IP unassigned", "success")
      setAssignIp(null)
      window.location.reload()
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const result = await deleteIpAddress(deleteId)
    if (result.success) {
      setIps((prev) => prev.filter((ip) => ip.ipAddress !== deleteId))
      showToast("IP deleted", "success")
    }
    setDeleteId(null)
  }

  // Stats
  const freeCount = ips.filter((ip) => ip.status === "FREE").length
  const assignedCount = ips.filter((ip) => ip.status === "ASSIGNED").length
  const reservedCount = ips.filter((ip) => ip.status === "RESERVED").length

  const filtered = ips.filter((ip) =>
    ip.ipAddress.includes(search) ||
    ip.server.serverName.toLowerCase().includes(search.toLowerCase()) ||
    (ip.vm?.customer.companyName || "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg ${toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          { label: "Free", count: freeCount, color: "text-green-600", bg: "bg-green-50" },
          { label: "Assigned", count: assignedCount, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Reserved", count: reservedCount, color: "text-orange-600", bg: "bg-orange-50" },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={`stat-card flex items-center gap-3`}>
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Network size={18} className={color} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{count}</p>
              <p className="text-xs text-slate-500">{label} IPs</p>
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
            placeholder="Search IP addresses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Plus size={14} />
          Add IP
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>IP Address</th>
              <th>Server</th>
              <th>Assigned VM</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  <Network size={32} className="mx-auto mb-2 opacity-30" />
                  <p>No IP addresses found</p>
                </td>
              </tr>
            ) : (
              filtered.map((ip) => (
                <tr key={ip.ipAddress}>
                  <td className="font-mono text-sm font-medium text-slate-900">{ip.ipAddress}</td>
                  <td className="text-sm text-slate-700">{ip.server.serverName}</td>
                  <td className="text-sm text-slate-700">{ip.vm?.vmName || "—"}</td>
                  <td className="text-sm text-slate-700">{ip.vm?.customer.companyName || "—"}</td>
                  <td><span className={`badge ${statusColors[ip.status]}`}>{ip.status.toLowerCase()}</span></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setAssignIp(ip)
                          setSelectedVmId(ip.vmId || "")
                        }}
                        className="p-1.5 hover:bg-blue-50 rounded text-blue-600"
                        title={ip.status === "ASSIGNED" ? "Reassign" : "Assign to VM"}
                      >
                        {ip.status === "ASSIGNED" ? <Link size={14} /> : <Link size={14} />}
                      </button>
                      <button onClick={() => setDeleteId(ip.ipAddress)} className="p-1.5 hover:bg-red-50 rounded text-red-600">
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

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-slate-100">
              <h2 className="font-bold text-slate-900" style={{ fontFamily: "Sora, sans-serif" }}>Add IP Address</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">IP Address *</label>
                <input type="text" placeholder="e.g., 192.168.1.100" value={createForm.ipAddress}
                  onChange={(e) => setCreateForm((f) => ({ ...f, ipAddress: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="form-label">Server *</label>
                <select value={createForm.serverId} onChange={(e) => setCreateForm((f) => ({ ...f, serverId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select server...</option>
                  {servers.map((s) => <option key={s.id} value={s.id}>{s.serverName}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Assign to VM (optional)</label>
                <select value={createForm.vmId} onChange={(e) => setCreateForm((f) => ({ ...f, vmId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Not assigned</option>
                  {vms.map((v) => <option key={v.id} value={v.id}>{v.vmName || v.id.slice(-6)} ({v.customer.companyName})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Status</label>
                  <select value={createForm.status} onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value as IpStatus }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                    {IP_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg">Cancel</button>
              <button onClick={handleCreate} disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">
                {loading ? "Adding..." : "Add IP"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignIp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-slate-100">
              <h2 className="font-bold text-slate-900" style={{ fontFamily: "Sora, sans-serif" }}>
                Assign IP: {assignIp.ipAddress}
              </h2>
            </div>
            <div className="p-6">
              <label className="form-label">Assign to VM</label>
              <select value={selectedVmId} onChange={(e) => setSelectedVmId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                <option value="">Unassign (set as FREE)</option>
                {vms.map((v) => <option key={v.id} value={v.id}>{v.vmName || v.id.slice(-6)} ({v.customer.companyName})</option>)}
              </select>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setAssignIp(null)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg">Cancel</button>
              <button onClick={handleAssign} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg">
                {selectedVmId ? "Assign" : "Unassign"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 shadow-2xl max-w-sm mx-4">
            <h3 className="font-bold text-slate-900 mb-2">Delete IP Address?</h3>
            <p className="text-sm text-slate-500 mb-6">This IP will be removed from the system.</p>
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
