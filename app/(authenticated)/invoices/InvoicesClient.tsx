"use client"

import { useState } from "react"
import { Plus, FileBarChart2, Search, DollarSign, Printer, Eye } from "lucide-react"
import { createInvoice, recordPayment } from "./actions"
import type { Invoice, PaymentStatus, Customer } from "@prisma/client"

type InvoiceWithRelations = Invoice & {
  customer: { companyName: string }
}

const statusColors: Record<PaymentStatus, string> = {
  PENDING: "badge-pending",
  PARTIAL: "badge-partial",
  PAID: "badge-paid",
}

export default function InvoicesClient({
  invoices: initial,
  customers,
}: {
  invoices: InvoiceWithRelations[]
  customers: Customer[]
}) {
  const invoices = initial
  const [search, setSearch] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [viewInvoice, setViewInvoice] = useState<InvoiceWithRelations | null>(null)
  const [payingInvoice, setPayingInvoice] = useState<InvoiceWithRelations | null>(null)
  const [payAmount, setPayAmount] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)
  const [createForm, setCreateForm] = useState({
    customerId: "",
    amountDue: 0,
    dueDate: "",
  })

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleCreate = async () => {
    if (!createForm.customerId || !createForm.amountDue || !createForm.dueDate) {
      showToast("All fields required", "error")
      return
    }
    setLoading(true)
    const result = await createInvoice(createForm)
    if (result.success) {
      showToast("Invoice created", "success")
      setShowCreate(false)
      window.location.reload()
    } else {
      showToast(result.error || "Failed", "error")
    }
    setLoading(false)
  }

  const handleRecordPayment = async () => {
    if (!payingInvoice || !payAmount) {
      showToast("Enter payment amount", "error")
      return
    }
    const result = await recordPayment(payingInvoice.id, payAmount)
    if (result.success) {
      showToast("Payment recorded", "success")
      setPayingInvoice(null)
      window.location.reload()
    } else {
      showToast(result.error || "Failed", "error")
    }
  }

  const totalDue = invoices.reduce((s, inv) => s + Number(inv.amountDue), 0)
  const totalPaid = invoices.reduce((s, inv) => s + Number(inv.amountPaid), 0)
  const totalOutstanding = totalDue - totalPaid

  const filtered = invoices.filter((inv) =>
    inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
    inv.customer.companyName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg ${toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          { label: "Total Invoiced", value: `$${totalDue.toLocaleString()}`, color: "text-slate-900", bg: "bg-slate-50" },
          { label: "Total Paid", value: `$${totalPaid.toLocaleString()}`, color: "text-green-600", bg: "bg-green-50" },
          { label: "Outstanding", value: `$${totalOutstanding.toLocaleString()}`, color: "text-orange-600", bg: "bg-orange-50" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="stat-card flex items-center gap-3">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
              <DollarSign size={18} className={color} />
            </div>
            <div>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
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
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Plus size={14} />
          New Invoice
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Customer</th>
              <th>Amount Due</th>
              <th>Amount Paid</th>
              <th>Outstanding</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-slate-400">
                  <FileBarChart2 size={32} className="mx-auto mb-2 opacity-30" />
                  <p>No invoices found</p>
                </td>
              </tr>
            ) : (
              filtered.map((inv) => {
                const outstanding = Number(inv.amountDue) - Number(inv.amountPaid)
                return (
                  <tr key={inv.id}>
                    <td className="font-mono text-sm font-medium text-slate-900">{inv.invoiceNumber}</td>
                    <td className="text-slate-700">{inv.customer.companyName}</td>
                    <td className="font-medium text-slate-900">${Number(inv.amountDue).toLocaleString()}</td>
                    <td className="font-medium text-green-700">${Number(inv.amountPaid).toLocaleString()}</td>
                    <td className={`font-medium ${outstanding > 0 ? "text-orange-600" : "text-slate-400"}`}>
                      ${outstanding.toLocaleString()}
                    </td>
                    <td className="text-sm text-slate-600">{new Date(inv.dueDate).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${statusColors[inv.status]}`}>{inv.status}</span>
                    </td>
                    <td className="flex items-center gap-2">
                      <button onClick={() => setViewInvoice(inv)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="View Invoice">
                        <Eye size={14} />
                      </button>
                      {inv.status !== "PAID" && (
                        <button
                          onClick={() => {
                            setPayingInvoice(inv)
                            setPayAmount(outstanding)
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          <DollarSign size={10} />
                          Pay
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

      {/* View Modal */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 no-print">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto print-area">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-slate-900" style={{ fontFamily: "Sora, sans-serif" }}>
                  Invoice {viewInvoice.invoiceNumber}
                </h2>
                <p className="text-sm text-slate-500">{viewInvoice.customer.companyName}</p>
              </div>
              <span className={`badge ${statusColors[viewInvoice.status]}`}>
                {viewInvoice.status}
              </span>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div><p className="text-xs text-slate-500">Issued At</p><p className="text-sm font-medium">{new Date(viewInvoice.issuedAt).toLocaleDateString()}</p></div>
                <div><p className="text-xs text-slate-500">Due Date</p><p className="text-sm font-medium">{new Date(viewInvoice.dueDate).toLocaleDateString()}</p></div>
                <div><p className="text-xs text-slate-500">Amount Due</p><p className="text-sm font-medium text-slate-900">${Number(viewInvoice.amountDue).toLocaleString()}</p></div>
                <div><p className="text-xs text-slate-500">Amount Paid</p><p className="text-sm font-medium text-green-700">${Number(viewInvoice.amountPaid).toLocaleString()}</p></div>
                <div><p className="text-xs text-slate-500">Outstanding</p><p className="text-sm font-medium text-orange-600">${(Number(viewInvoice.amountDue) - Number(viewInvoice.amountPaid)).toLocaleString()}</p></div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 no-print">
              <button onClick={() => setViewInvoice(null)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg">Close</button>
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-slate-100">
              <h2 className="font-bold text-slate-900" style={{ fontFamily: "Sora, sans-serif" }}>Create Invoice</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">Customer *</label>
                <select value={createForm.customerId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, customerId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Amount Due *</label>
                <input type="number" value={createForm.amountDue}
                  onChange={(e) => setCreateForm((f) => ({ ...f, amountDue: Number(e.target.value) }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="form-label">Due Date *</label>
                <input type="date" value={createForm.dueDate}
                  onChange={(e) => setCreateForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg">Cancel</button>
              <button onClick={handleCreate} disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">
                {loading ? "Creating..." : "Create Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {payingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-slate-100">
              <h2 className="font-bold text-slate-900" style={{ fontFamily: "Sora, sans-serif" }}>Record Payment</h2>
              <p className="text-sm text-slate-500 mt-1">{payingInvoice.invoiceNumber}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Amount Due:</span>
                  <span className="font-medium">${Number(payingInvoice.amountDue).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-slate-600">Already Paid:</span>
                  <span className="font-medium text-green-600">${Number(payingInvoice.amountPaid).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mt-1 font-bold">
                  <span className="text-slate-900">Remaining:</span>
                  <span className="text-orange-600">${(Number(payingInvoice.amountDue) - Number(payingInvoice.amountPaid)).toLocaleString()}</span>
                </div>
              </div>
              <div>
                <label className="form-label">Payment Amount *</label>
                <input type="number" value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setPayingInvoice(null)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg">Cancel</button>
              <button onClick={handleRecordPayment} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg">
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
