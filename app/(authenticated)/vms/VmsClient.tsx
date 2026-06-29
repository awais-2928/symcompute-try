"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, MonitorCheck, Search, TrendingUp, Cpu, History, ArrowLeftRight } from "lucide-react"
import { createVm, updateVmStatus, upgradeVm, deleteVm, getVmAuditLogs, migrateVm } from "./actions"
import type { Vm, VmStatus, IpAddress, VmUpgradeHistory, BareMetalServer, Customer } from "@prisma/client"

type VmWithRelations = Vm & {
  server: { serverName: string; dataCenterName: string }
  customer: { companyName: string }
  ips: Pick<IpAddress, "ipAddress" | "status">[]
  upgradeHistory: Pick<VmUpgradeHistory, "oldCpu" | "newCpu" | "oldRamGb" | "newRamGb" | "oldStorageGb" | "newStorageGb" | "timestamp">[]
}

type ServerOption = Pick<BareMetalServer, "id" | "serverName" | "dataCenterName" | "ramGb" | "storageGb">
type CustomerOption = Pick<Customer, "id" | "companyName">

const VM_STATUSES: VmStatus[] = ["PROVISIONED", "ACTIVE", "DISABLED", "SUSPENDED"]

interface CreateFormData {
  serverId: string
  customerId: string
  vmName: string
  cpuAllocated: number
  ramAllocatedGb: number
  storageAllocatedGb: number
  status: VmStatus
}

export default function VmsClient({
  vms: initial,
  servers,
  customers,
}: {
  vms: VmWithRelations[]
  servers: ServerOption[]
  customers: CustomerOption[]
}) {
  const [vms, setVms] = useState(initial)

  useEffect(() => {
    setVms(initial)
  }, [initial])

  const [search, setSearch] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState<VmWithRelations | null>(null)
  const [showHistory, setShowHistory] = useState<VmWithRelations | null>(null)
  const [showMigrate, setShowMigrate] = useState<VmWithRelations | null>(null)
  const [destServerId, setDestServerId] = useState("")
  const [migrationReason, setMigrationReason] = useState("")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [statusLogs, setStatusLogs] = useState<any[]>([])
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)
  const [upgradeForm, setUpgradeForm] = useState({ cpuAllocated: 0, ramAllocatedGb: 0, storageAllocatedGb: 0 })
  const [createForm, setCreateForm] = useState<CreateFormData>({
    serverId: "",
    customerId: "",
    vmName: "",
    cpuAllocated: 4,
    ramAllocatedGb: 8,
    storageAllocatedGb: 100,
    status: "PROVISIONED",
  })

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleCreate = async () => {
    if (!createForm.serverId || !createForm.customerId) {
      showToast("Server and customer are required", "error")
      return
    }
    setLoading(true)
    const result = await createVm({ ...createForm, vmName: createForm.vmName || undefined })
    if (result.success) {
      showToast("VM created successfully", "success")
      setShowCreate(false)
      window.location.reload()
    } else {
      showToast(result.error || "Failed", "error")
    }
    setLoading(false)
  }

  const handleStatusChange = async (id: string, status: VmStatus) => {
    const result = await updateVmStatus(id, status)
    if (result.success) {
      setVms((prev) => prev.map((v) => v.id === id ? { ...v, status } : v))
      showToast("Status updated", "success")
    }
  }

  const handleUpgrade = async () => {
    if (!showUpgrade) return
    setLoading(true)
    const result = await upgradeVm(showUpgrade.id, upgradeForm)
    if (result.success) {
      showToast("VM upgraded successfully", "success")
      setShowUpgrade(null)
      window.location.reload()
    } else {
      showToast(result.error || "Failed", "error")
    }
    setLoading(false)
  }

  const handleOpenHistory = async (vm: VmWithRelations) => {
    setShowHistory(vm)
    setStatusLogs([])
    const logs = await getVmAuditLogs(vm.id)
    setStatusLogs(logs)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const result = await deleteVm(deleteId)
    if (result.success) {
      setVms((prev) => prev.filter((v) => v.id !== deleteId))
      showToast("VM deleted", "success")
    }
    setDeleteId(null)
  }

  const handleMigrate = async () => {
    if (!showMigrate || !destServerId) return
    setLoading(true)
    const result = await migrateVm(showMigrate.id, destServerId, migrationReason || undefined)
    if (result.success) {
      showToast("VM migrated successfully", "success")
      setShowMigrate(null)
      setDestServerId("")
      setMigrationReason("")
      window.location.reload()
    } else {
      showToast(result.error || "Failed to migrate VM", "error")
    }
    setLoading(false)
  }

  const filtered = vms.filter(
    (v) =>
      (v.vmName || "").toLowerCase().includes(search.toLowerCase()) ||
      v.server.serverName.toLowerCase().includes(search.toLowerCase()) ||
      v.customer.companyName.toLowerCase().includes(search.toLowerCase())
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
            placeholder="Search VMs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Plus size={14} />
          Create VM
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>VM Name</th>
              <th>Customer</th>
              <th>Server</th>
              <th>Resources</th>
              <th>IP Addresses</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  <MonitorCheck size={32} className="mx-auto mb-2 opacity-30" />
                  <p>No VMs found</p>
                </td>
              </tr>
            ) : (
              filtered.map((vm) => (
                <tr key={vm.id}>
                  <td>
                    <div className="font-medium text-slate-900">{vm.vmName || `VM-${vm.id.slice(-6)}`}</div>
                    <div className="text-xs text-slate-400">{new Date(vm.creationDate).toLocaleDateString()}</div>
                  </td>
                  <td className="text-slate-700">{vm.customer.companyName}</td>
                  <td>
                    <div className="text-sm text-slate-700">{vm.server.serverName}</div>
                    <div className="text-xs text-slate-400">{vm.server.dataCenterName}</div>
                  </td>
                  <td>
                    <div className="text-xs text-slate-600">
                      <div className="flex items-center gap-1"><Cpu size={10} /> {vm.cpuAllocated} vCPU</div>
                      <div>{vm.ramAllocatedGb}GB RAM · {vm.storageAllocatedGb}GB</div>
                    </div>
                  </td>
                  <td>
                    <div className="space-y-0.5">
                      {vm.ips.length === 0 ? (
                        <span className="text-xs text-slate-400">No IPs</span>
                      ) : (
                        vm.ips.slice(0, 2).map((ip) => (
                          <div key={ip.ipAddress} className="text-xs font-mono text-slate-700">{ip.ipAddress}</div>
                        ))
                      )}
                    </div>
                  </td>
                  <td>
                    <select
                      value={vm.status}
                      onChange={(e) => handleStatusChange(vm.id, e.target.value as VmStatus)}
                      className={`text-xs px-2 py-1 rounded border-0 cursor-pointer ${
                        vm.status === "ACTIVE" ? "bg-green-50 text-green-700" :
                        vm.status === "PROVISIONED" ? "bg-blue-50 text-blue-700" :
                        vm.status === "DISABLED" ? "bg-slate-50 text-slate-600" :
                        "bg-red-50 text-red-700"
                      }`}
                    >
                      {VM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setShowUpgrade(vm)
                          setUpgradeForm({
                            cpuAllocated: vm.cpuAllocated,
                            ramAllocatedGb: vm.ramAllocatedGb,
                            storageAllocatedGb: vm.storageAllocatedGb,
                          })
                        }}
                        className="p-1.5 hover:bg-purple-50 rounded text-purple-600"
                        title="Upgrade"
                      >
                        <TrendingUp size={14} />
                      </button>
                      <button onClick={() => handleOpenHistory(vm)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="History">
                        <History size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setShowMigrate(vm)
                          setDestServerId("")
                          setMigrationReason("")
                        }}
                        className="p-1.5 hover:bg-blue-50 rounded text-blue-600"
                        title="Migrate"
                      >
                        <ArrowLeftRight size={14} />
                      </button>
                      <button onClick={() => setDeleteId(vm.id)} className="p-1.5 hover:bg-red-50 rounded text-red-600" title="Delete">
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="p-6 border-b border-slate-100">
              <h2 className="font-bold text-slate-900" style={{ fontFamily: "Sora, sans-serif" }}>Create Virtual Machine</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">VM Name (optional)</label>
                <input
                  type="text"
                  value={createForm.vmName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, vmName: e.target.value }))}
                  placeholder="e.g., web-server-01"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="form-label">Server *</label>
                <select
                  value={createForm.serverId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, serverId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select server...</option>
                  {servers.map((s) => <option key={s.id} value={s.id}>{s.serverName} ({s.dataCenterName})</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Customer *</label>
                <select
                  value={createForm.customerId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, customerId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select customer...</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "vCPU", key: "cpuAllocated" },
                  { label: "RAM (GB)", key: "ramAllocatedGb" },
                  { label: "Storage (GB)", key: "storageAllocatedGb" },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="form-label">{label}</label>
                    <input
                      type="number"
                      value={(createForm as unknown as Record<string, number | string>)[key] as number}
                      onChange={(e) => setCreateForm((f) => ({ ...f, [key]: Number(e.target.value) }))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg">Cancel</button>
              <button onClick={handleCreate} disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">
                {loading ? "Creating..." : "Create VM"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-slate-100">
              <h2 className="font-bold text-slate-900" style={{ fontFamily: "Sora, sans-serif" }}>
                Upgrade VM: {showUpgrade.vmName || `VM-${showUpgrade.id.slice(-6)}`}
              </h2>
            </div>
            <div className="p-6 grid grid-cols-3 gap-3">
              {[
                { label: "vCPU", key: "cpuAllocated" },
                { label: "RAM (GB)", key: "ramAllocatedGb" },
                { label: "Storage (GB)", key: "storageAllocatedGb" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="form-label">{label}</label>
                  <input
                    type="number"
                    value={(upgradeForm as Record<string, number>)[key]}
                    onChange={(e) => setUpgradeForm((f) => ({ ...f, [key]: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowUpgrade(null)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg">Cancel</button>
              <button onClick={handleUpgrade} disabled={loading} className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg disabled:opacity-50">
                {loading ? "Upgrading..." : "Apply Upgrade"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-slate-900" style={{ fontFamily: "Sora, sans-serif" }}>
                Upgrade History: {showHistory.vmName || `VM-${showHistory.id.slice(-6)}`}
              </h2>
              <button onClick={() => setShowHistory(null)} className="text-slate-400 hover:text-slate-600 text-sm">Close</button>
            </div>
            <div className="p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">Resource Allocations</h3>
              {showHistory.upgradeHistory.length === 0 ? (
                <div className="text-center py-4 text-slate-400">
                  <p className="text-sm">No upgrade history found</p>
                </div>
              ) : (
                <div className="space-y-4 mb-8">
                  {showHistory.upgradeHistory.map((hist, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-100 rounded-lg p-4">
                      <div className="text-xs text-slate-500 mb-2">
                        {new Date(hist.timestamp).toLocaleString()}
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500 text-xs uppercase tracking-wide">CPU</p>
                          <p className="font-medium">{hist.oldCpu} &rarr; {hist.newCpu}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs uppercase tracking-wide">RAM</p>
                          <p className="font-medium">{hist.oldRamGb}GB &rarr; {hist.newRamGb}GB</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs uppercase tracking-wide">Storage</p>
                          <p className="font-medium">{hist.oldStorageGb}GB &rarr; {hist.newStorageGb}GB</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">Status Changes</h3>
              {statusLogs.length === 0 ? (
                <div className="text-center py-4 text-slate-400">
                  <p className="text-sm">No status changes found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {statusLogs.map((log) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const changes = log.changes as any
                    if (!changes?.newStatus) return null
                    return (
                      <div key={log.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-3 text-sm">
                        <div className="text-slate-500 text-xs">
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-400">{changes.oldStatus || "UNKNOWN"}</span>
                          <span className="text-slate-300">&rarr;</span>
                          <span className={`badge ${
                            changes.newStatus === "ACTIVE" ? "bg-green-100 text-green-700" :
                            changes.newStatus === "PROVISIONED" ? "bg-blue-100 text-blue-700" :
                            changes.newStatus === "DISABLED" ? "bg-slate-100 text-slate-600" :
                            "bg-red-100 text-red-700"
                          }`}>{changes.newStatus}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Migrate Modal */}
      {showMigrate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-slate-100">
              <h2 className="font-bold text-slate-900" style={{ fontFamily: "Sora, sans-serif" }}>
                Migrate VM: {showMigrate.vmName || `VM-${showMigrate.id.slice(-6)}`}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label mb-1">Current Server</label>
                <div className="text-sm font-medium text-slate-600 bg-slate-50 p-2.5 border border-slate-200 rounded-lg">
                  {showMigrate.server.serverName} ({showMigrate.server.dataCenterName})
                </div>
              </div>

              <div>
                <label className="form-label mb-1">Destination Server</label>
                <select
                  value={destServerId}
                  onChange={(e) => setDestServerId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select destination server...</option>
                  {servers
                    .filter((s) => s.id !== showMigrate.serverId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.serverName} ({s.dataCenterName}) [RAM: {s.ramGb}GB, Storage: {s.storageGb}GB]
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="form-label mb-1">Reason for Migration (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Load balancing, Server maintenance..."
                  value={migrationReason}
                  onChange={(e) => setMigrationReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800 space-y-1">
                <p className="font-semibold">Required VM Resources:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>vCPU Cores: {showMigrate.cpuAllocated}</li>
                  <li>RAM: {showMigrate.ramAllocatedGb} GB</li>
                  <li>Storage: {showMigrate.storageAllocatedGb} GB</li>
                </ul>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowMigrate(null)
                  setDestServerId("")
                  setMigrationReason("")
                }}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleMigrate}
                disabled={loading || !destServerId}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50 font-medium"
              >
                {loading ? "Migrating..." : "Start Migration"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 shadow-2xl max-w-sm mx-4">
            <h3 className="font-bold text-slate-900 mb-2">Delete VM?</h3>
            <p className="text-sm text-slate-500 mb-6">This will mark the VM as deleted.</p>
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
