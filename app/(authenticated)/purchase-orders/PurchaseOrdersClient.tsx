"use client"

import { useState } from "react"
import { Search, FileCheck } from "lucide-react"
import { updatePoContractStatus } from "../quotations/actions"
import type { ContractStatus } from "@prisma/client"

interface POWithRelations {
  id: string
  poNumber: string
  poDate: string
  contractStatus: ContractStatus
  paymentStatus: string
  createdAt: string
  customer: {
    companyName: string
  }
  quotation: {
    quoteGroupId: string
    version: number
    sellingPrice: number
  }
}

const statusColors: Record<ContractStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  ACTIVE: "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
}

export default function PurchaseOrdersClient({
  initialPurchaseOrders,
}: {
  initialPurchaseOrders: POWithRelations[]
}) {
  const [purchaseOrders, setPurchaseOrders] = useState<POWithRelations[]>(initialPurchaseOrders)
  const [search, setSearch] = useState("")
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleStatusChange = async (id: string, status: ContractStatus) => {
    setLoadingId(id)
    const result = await updatePoContractStatus(id, status)
    if (result.success) {
      setPurchaseOrders((prev) =>
        prev.map((po) => (po.id === id ? { ...po, contractStatus: status } : po))
      )
      showToast("Contract status updated successfully", "success")
    } else {
      showToast(result.error || "Failed to update status", "error")
    }
    setLoadingId(null)
  }

  const filtered = purchaseOrders.filter(
    (po) =>
      po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      po.customer.companyName.toLowerCase().includes(search.toLowerCase()) ||
      po.quotation.quoteGroupId.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg border transition-all duration-300 ${
            toast.type === "success"
              ? "bg-green-600 border-green-500 text-white"
              : "bg-red-600 border-red-500 text-white"
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
            placeholder="Search POs (Number, customer, quote...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="data-table w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">PO Number</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Linked Quotation</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">PO Date</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contract Status</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  <FileCheck size={32} className="mx-auto mb-2 opacity-30" />
                  <p>No purchase orders found</p>
                </td>
              </tr>
            ) : (
              filtered.map((po) => (
                <tr key={po.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-semibold text-slate-700">{po.poNumber}</span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {po.customer.companyName}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-xs text-slate-600">
                        Q-{po.quotation.quoteGroupId.slice(-8).toUpperCase()}
                      </span>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded w-max">
                        v{po.quotation.version}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(po.poDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    ${po.quotation.sellingPrice.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={po.contractStatus}
                      disabled={loadingId === po.id}
                      onChange={(e) => handleStatusChange(po.id, e.target.value as ContractStatus)}
                      className={`text-xs px-2.5 py-1 rounded-full border bg-white font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                        statusColors[po.contractStatus]
                      }`}
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        po.paymentStatus === "PAID"
                          ? "bg-green-50 text-green-700"
                          : po.paymentStatus === "PARTIAL"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {po.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
