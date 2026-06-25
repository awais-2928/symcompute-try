"use client"

import { useState } from "react"
import { Plus, Search, Eye, XCircle, ShoppingCart, Printer, FileText } from "lucide-react"
import { createQuotation, updateQuotationStatus, createPurchaseOrder, updatePoContractStatus, createQuotationRevision } from "./actions"
import type { Quotation, QuotationItem, PurchaseOrder, Customer, QuoStatus, ContractStatus } from "@prisma/client"

type QuotationWithRelations = Quotation & {
  customer: { companyName: string }
  createdBy: { name: string }
  items: QuotationItem[]
  purchaseOrders: Pick<PurchaseOrder, "id" | "poNumber" | "contractStatus" | "paymentStatus">[]
}

type CustomerOption = Pick<Customer, "id" | "companyName">

const statusColors: Record<QuoStatus, string> = {
  DRAFT: "badge-draft",
  SENT: "badge-sent",
  ACCEPTED: "badge-accepted",
  EXPIRED: "badge-expired",
  INVALIDATED: "badge-inactive",
}

const STATUSES: QuoStatus[] = ["DRAFT", "SENT", "ACCEPTED", "EXPIRED", "INVALIDATED"]

interface ItemForm {
  vmNameLabel: string
  cpuCores: number
  ramGb: number
  storageGb: number
  quantity: number
  cpuCost: number
  ramCost: number
  storageCost: number
  ipCost: number
}

const emptyItem: ItemForm = {
  vmNameLabel: "",
  cpuCores: 4,
  ramGb: 8,
  storageGb: 100,
  quantity: 1,
  cpuCost: 0,
  ramCost: 0,
  storageCost: 0,
  ipCost: 0,
}

export default function QuotationsClient({
  quotations: initial,
  customers,
}: {
  quotations: QuotationWithRelations[]
  customers: CustomerOption[]
}) {
  const [quotations, setQuotations] = useState(initial)
  const [search, setSearch] = useState("")
  const [viewQuote, setViewQuote] = useState<QuotationWithRelations | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)
  const [createForm, setCreateForm] = useState({
    customerId: "",
    expiryDate: "",
    profitMargin: 20,
    items: [{ ...emptyItem }] as ItemForm[],
  })

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const totalCost = createForm.items.reduce((sum, item) => {
    return sum + (item.cpuCost + item.ramCost + item.storageCost + item.ipCost) * item.quantity
  }, 0)
  const sellingPrice = totalCost * (1 + createForm.profitMargin / 100)

  const handleCreate = async () => {
    if (!createForm.customerId || !createForm.expiryDate) {
      showToast("Customer and expiry date are required", "error")
      return
    }
    setLoading(true)
    const result = await createQuotation(createForm)
    if (result.success) {
      showToast("Quotation created", "success")
      setShowCreate(false)
      window.location.reload()
    } else {
      showToast(result.error || "Failed", "error")
    }
    setLoading(false)
  }

  const handleStatusChange = async (id: string, status: QuoStatus) => {
    const result = await updateQuotationStatus(id, status)
    if (result.success) {
      setQuotations((prev) => prev.map((q) => q.id === id ? { ...q, status } : q))
      showToast("Status updated", "success")
    }
  }

  const handleCreatePO = async (q: QuotationWithRelations) => {
    if (q.status !== "ACCEPTED") {
      showToast("Purchase Orders can only be generated from ACCEPTED quotations", "error")
      return
    }
    const poDate = new Date().toISOString().split("T")[0]
    const result = await createPurchaseOrder(q.id, q.customerId, poDate)
    if (result.success) {
      showToast("Purchase Order created", "success")
      window.location.reload()
    } else {
      showToast(result.error || "Failed", "error")
    }
  }

  const handleCreateRevision = async (q: QuotationWithRelations) => {
    setLoading(true)
    const result = await createQuotationRevision(q.id, {
      customerId: q.customerId,
      expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      profitMargin: Number(q.profitMargin),
      items: q.items.map(item => ({
        vmNameLabel: item.vmNameLabel || "",
        cpuCores: item.cpuCores,
        ramGb: item.ramGb,
        storageGb: item.storageGb,
        quantity: item.quantity,
        cpuCost: Number(item.cpuCost),
        ramCost: Number(item.ramCost),
        storageCost: Number(item.storageCost),
        ipCost: Number(item.ipCost),
      }))
    })
    if (result.success) {
      showToast("Revision created", "success")
      window.location.reload()
    } else {
      showToast(result.error || "Failed", "error")
    }
    setLoading(false)
  }

  const handleContractStatusChange = async (poId: string, status: ContractStatus) => {
    const result = await updatePoContractStatus(poId, status)
    if (result.success) {
      if (viewQuote) {
        setViewQuote({
          ...viewQuote,
          purchaseOrders: viewQuote.purchaseOrders.map((po) => po.id === poId ? { ...po, contractStatus: status } : po)
        })
      }
      setQuotations((prev) => prev.map((q) => ({
        ...q,
        purchaseOrders: q.purchaseOrders.map((po) => po.id === poId ? { ...po, contractStatus: status } : po)
      })))
      showToast("Contract status updated", "success")
    } else {
      showToast(result.error || "Failed to update", "error")
    }
  }

  const filtered = quotations.filter((q) =>
    q.customer.companyName.toLowerCase().includes(search.toLowerCase()) ||
    q.quoteGroupId.toLowerCase().includes(search.toLowerCase())
  )

  const addItem = () => setCreateForm((f) => ({ ...f, items: [...f.items, { ...emptyItem }] }))
  const removeItem = (i: number) => setCreateForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))
  const updateItem = (i: number, key: keyof ItemForm, val: string | number) =>
    setCreateForm((f) => ({
      ...f,
      items: f.items.map((item, idx) => idx === i ? { ...item, [key]: val } : item)
    }))

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
            placeholder="Search quotations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Plus size={14} />
          New Quotation
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Quote ID</th>
              <th>Customer</th>
              <th>Created By</th>
              <th>Items</th>
              <th>Total Cost</th>
              <th>Selling Price</th>
              <th>Expiry</th>
              <th>Status</th>
              <th>POs</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-slate-400">
                  <FileText size={32} className="mx-auto mb-2 opacity-30" />
                  <p>No quotations found</p>
                </td>
              </tr>
            ) : (
              filtered.map((q) => {
                const isExpired = new Date(q.expiryDate) < new Date() && q.status !== "ACCEPTED"
                const displayStatus = isExpired ? "EXPIRED" : q.status

                return (
                  <tr key={q.id} className={isExpired ? "opacity-75" : ""}>
                    <td>
                      <div className="font-mono text-xs text-slate-600">Q-{q.quoteGroupId.slice(-8).toUpperCase()}</div>
                      <div className="text-xs font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded inline-block mt-1">v{q.version}</div>
                    </td>
                    <td className="font-medium text-slate-900">{q.customer.companyName}</td>
                    <td className="text-sm text-slate-600">{q.createdBy.name}</td>
                    <td className="text-center text-sm text-slate-700">{q.items.length}</td>
                    <td className="font-medium text-slate-900">${Number(q.totalCost).toLocaleString()}</td>
                    <td className="font-medium text-green-700">${Number(q.sellingPrice).toLocaleString()}</td>
                    <td className="text-sm text-slate-600">
                      <span className={isExpired ? "text-red-600 font-medium" : ""}>
                        {new Date(q.expiryDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      <select
                        value={displayStatus}
                        onChange={(e) => handleStatusChange(q.id, e.target.value as QuoStatus)}
                        className={`text-xs px-2 py-1 rounded border border-slate-200 bg-white ${isExpired ? "text-red-600" : ""}`}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="text-center text-sm text-slate-700">{q.purchaseOrders.length}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setViewQuote(q)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="View">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => handleCreateRevision(q)} disabled={loading} className="p-1.5 hover:bg-amber-50 rounded text-amber-600 disabled:opacity-50" title="Create Revision">
                          <FileText size={14} />
                        </button>
                        {q.status === "ACCEPTED" && q.purchaseOrders.length === 0 && (
                          <button onClick={() => handleCreatePO(q)} className="p-1.5 hover:bg-green-50 rounded text-green-600" title="Create PO">
                            <ShoppingCart size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* View Modal */}
      {viewQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 no-print">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto print-area">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-slate-900" style={{ fontFamily: "Sora, sans-serif" }}>
                  Quotation Details
                </h2>
                <p className="text-sm text-slate-500">{viewQuote.customer.companyName}</p>
              </div>
              <span className={`badge ${statusColors[new Date(viewQuote.expiryDate) < new Date() && viewQuote.status !== "ACCEPTED" ? "EXPIRED" : viewQuote.status]}`}>
                {new Date(viewQuote.expiryDate) < new Date() && viewQuote.status !== "ACCEPTED" ? "EXPIRED" : viewQuote.status}
              </span>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div><p className="text-xs text-slate-500">Created By</p><p className="text-sm font-medium">{viewQuote.createdBy.name}</p></div>
                <div><p className="text-xs text-slate-500">Expiry Date</p><p className="text-sm font-medium">{new Date(viewQuote.expiryDate).toLocaleDateString()}</p></div>
                <div><p className="text-xs text-slate-500">Total Cost</p><p className="text-sm font-medium text-slate-900">${Number(viewQuote.totalCost).toLocaleString()}</p></div>
                <div><p className="text-xs text-slate-500">Selling Price</p><p className="text-sm font-medium text-green-700">${Number(viewQuote.sellingPrice).toLocaleString()}</p></div>
                <div><p className="text-xs text-slate-500">Profit Margin</p><p className="text-sm font-medium">{Number(viewQuote.profitMargin)}%</p></div>
              </div>
              <h3 className="font-semibold text-slate-900 mb-3">Line Items</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>VM Label</th>
                    <th>CPU</th>
                    <th>RAM</th>
                    <th>Storage</th>
                    <th>Qty</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewQuote.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.vmNameLabel || "—"}</td>
                      <td>{item.cpuCores} cores</td>
                      <td>{item.ramGb}GB</td>
                      <td>{item.storageGb}GB</td>
                      <td>{item.quantity}</td>
                      <td className="font-medium">${((Number(item.cpuCost) + Number(item.ramCost) + Number(item.storageCost) + Number(item.ipCost)) * item.quantity).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {viewQuote.purchaseOrders.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold text-slate-900 mb-2">Purchase Orders</h3>
                  {viewQuote.purchaseOrders.map((po) => (
                    <div key={po.id} className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="font-mono text-sm">{po.poNumber}</span>
                      <div className="flex gap-2 items-center">
                        <select
                          value={po.contractStatus}
                          onChange={(e) => handleContractStatusChange(po.id, e.target.value as ContractStatus)}
                          className="text-xs px-2 py-1 rounded border border-slate-200 bg-white"
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                        <span className={`badge ${po.paymentStatus === "PAID" ? "badge-paid" : po.paymentStatus === "PARTIAL" ? "badge-partial" : "badge-pending"}`}>{po.paymentStatus}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 no-print">
              <button onClick={() => setViewQuote(null)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg">Close</button>
              <button onClick={() => window.print()} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700">
                <Printer size={14} /> Export PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <h2 className="font-bold text-slate-900" style={{ fontFamily: "Sora, sans-serif" }}>Create Quotation</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="form-label">Expiry Date *</label>
                  <input
                    type="date"
                    value={createForm.expiryDate}
                    onChange={(e) => setCreateForm((f) => ({ ...f, expiryDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="form-label">Profit Margin (%)</label>
                  <input
                    type="number"
                    value={createForm.profitMargin}
                    onChange={(e) => setCreateForm((f) => ({ ...f, profitMargin: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="form-label !mb-0">VM Line Items</label>
                  <button onClick={addItem} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    <Plus size={12} /> Add Item
                  </button>
                </div>
                {createForm.items.map((item, i) => (
                  <div key={i} className="border border-slate-200 rounded-lg p-3 mb-2">
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      <div className="col-span-2">
                        <label className="text-xs text-slate-500">VM Label</label>
                        <input
                          type="text"
                          value={item.vmNameLabel}
                          onChange={(e) => updateItem(i, "vmNameLabel", e.target.value)}
                          placeholder="e.g., Web Server"
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Qty</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(i, "quantity", Number(e.target.value))}
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded"
                        />
                      </div>
                      <div className="flex items-end justify-end">
                        {createForm.items.length > 1 && (
                          <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">
                            <XCircle size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: "CPU Cores", key: "cpuCores" },
                        { label: "RAM GB", key: "ramGb" },
                        { label: "Storage GB", key: "storageGb" },
                        { label: "CPU Cost $", key: "cpuCost" },
                        { label: "RAM Cost $", key: "ramCost" },
                        { label: "Storage Cost $", key: "storageCost" },
                        { label: "IP Cost $", key: "ipCost" },
                      ].map(({ label, key }) => (
                        <div key={key}>
                          <label className="text-xs text-slate-500">{label}</label>
                          <input
                            type="number"
                            value={(item as unknown as Record<string, number | string>)[key] as number}
                            onChange={(e) => updateItem(i, key as keyof ItemForm, Number(e.target.value))}
                            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total Cost:</span>
                  <span className="font-medium">${totalCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-slate-600">Selling Price ({createForm.profitMargin}% margin):</span>
                  <span className="font-bold text-green-700">${sellingPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg">Cancel</button>
              <button onClick={handleCreate} disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">
                {loading ? "Creating..." : "Create Quotation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
