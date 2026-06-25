"use client"

import { useState } from "react"
import { Plus, Edit2, Trash2, Users, Search, Phone, Mail, Globe, ChevronDown, ChevronRight } from "lucide-react"
import { createCustomer, updateCustomer, deleteCustomer, createContact } from "./actions"
import type { Customer, CustomerContact, CustomerStatus } from "@prisma/client"

type CustomerWithRelations = Customer & {
  contacts: CustomerContact[]
  _count: { vms: number; quotations: number }
}

const statusColors: Record<CustomerStatus, string> = {
  PROSPECT: "badge-prospect",
  ACTIVE: "badge-active",
  SUSPENDED: "badge-suspended",
  DISCONTINUED: "badge-inactive",
}

const STATUSES: CustomerStatus[] = ["PROSPECT", "ACTIVE", "SUSPENDED", "DISCONTINUED"]

interface FormData {
  companyName: string
  companyAddress: string
  ntnNumber: string
  stnNumber: string
  website: string
  landlineNumber: string
  status: CustomerStatus
}

const emptyForm: FormData = {
  companyName: "",
  companyAddress: "",
  ntnNumber: "",
  stnNumber: "",
  website: "",
  landlineNumber: "",
  status: "PROSPECT",
}

export default function CustomersClient({ customers: initial }: { customers: CustomerWithRelations[] }) {
  const [customers, setCustomers] = useState(initial)
  const [search, setSearch] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState<string | null>(null)
  const [editing, setEditing] = useState<CustomerWithRelations | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [contactForm, setContactForm] = useState({ type: "Technical", name: "", designation: "", email: "", phone: "" })
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

  const openEdit = (c: CustomerWithRelations) => {
    setEditing(c)
    setForm({
      companyName: c.companyName,
      companyAddress: c.companyAddress,
      ntnNumber: c.ntnNumber || "",
      stnNumber: c.stnNumber || "",
      website: c.website || "",
      landlineNumber: c.landlineNumber || "",
      status: c.status,
    })
    setShowModal(true)
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const result = editing
        ? await updateCustomer(editing.id, form)
        : await createCustomer(form)

      if (result.success) {
        showToast(editing ? "Customer updated" : "Customer created", "success")
        setShowModal(false)
        window.location.reload()
      } else {
        showToast(result.error || "Failed", "error")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateContact = async () => {
    if (!showContactModal || !contactForm.name || !contactForm.email) {
      showToast("Name and email are required", "error")
      return
    }
    setLoading(true)
    const result = await createContact(showContactModal, contactForm)
    if (result.success) {
      showToast("Contact added", "success")
      setShowContactModal(null)
      window.location.reload()
    } else {
      showToast(result.error || "Failed", "error")
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const result = await deleteCustomer(deleteId)
    if (result.success) {
      setCustomers((prev) => prev.filter((c) => c.id !== deleteId))
      showToast("Customer deleted", "success")
    } else {
      showToast("Failed to delete", "error")
    }
    setDeleteId(null)
  }

  const filtered = customers.filter((c) =>
    c.companyName.toLowerCase().includes(search.toLowerCase())
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
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Plus size={14} />
          Add Customer
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Company</th>
              <th>Contact Info</th>
              <th>VMs</th>
              <th>Quotations</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  <Users size={32} className="mx-auto mb-2 opacity-30" />
                  <p>No customers found</p>
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <>
                  <tr key={c.id}>
                    <td className="w-8">
                      <button
                        onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        {expandedId === c.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    </td>
                    <td>
                      <div className="font-medium text-slate-900">{c.companyName}</div>
                      <div className="text-xs text-slate-400">{c.companyAddress}</div>
                    </td>
                    <td>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        {c.landlineNumber && (
                          <span className="flex items-center gap-1">
                            <Phone size={10} /> {c.landlineNumber}
                          </span>
                        )}
                        {c.website && (
                          <span className="flex items-center gap-1">
                            <Globe size={10} /> {c.website}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-center">
                      <span className="badge badge-provisioned">{c._count.vms}</span>
                    </td>
                    <td className="text-center">
                      <span className="badge badge-draft">{c._count.quotations}</span>
                    </td>
                    <td>
                      <span className={`badge ${statusColors[c.status]}`}>{c.status.toLowerCase()}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => setDeleteId(c.id)} className="p-1.5 hover:bg-red-50 rounded text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === c.id && (
                    <tr key={`${c.id}-contacts`} className="bg-slate-50">
                      <td colSpan={7} className="px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contacts</p>
                          <button
                            onClick={() => {
                              setContactForm({ type: "Technical", name: "", designation: "", email: "", phone: "" })
                              setShowContactModal(c.id)
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
                          >
                            <Plus size={12} /> Add Contact
                          </button>
                        </div>
                        {c.contacts.length === 0 ? (
                          <p className="text-sm text-slate-400">No contacts added</p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {c.contacts.map((contact) => (
                              <div key={contact.id} className="bg-white border border-slate-200 rounded-lg p-3">
                                <div className="font-medium text-sm text-slate-900">{contact.name}</div>
                                <div className="text-xs text-slate-500">{contact.designation} · {contact.type}</div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                  <span className="flex items-center gap-1"><Mail size={10} /> {contact.email}</span>
                                  <span className="flex items-center gap-1"><Phone size={10} /> {contact.phone}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {c.ntnNumber && (
                          <p className="text-xs text-slate-400 mt-2">NTN: {c.ntnNumber}{c.stnNumber ? ` · STN: ${c.stnNumber}` : ""}</p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <h2 className="font-bold text-slate-900" style={{ fontFamily: "Sora, sans-serif" }}>
                {editing ? "Edit Customer" : "Add Customer"}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: "Company Name *", key: "companyName" },
                { label: "Address *", key: "companyAddress" },
                { label: "NTN Number", key: "ntnNumber" },
                { label: "STN Number", key: "stnNumber" },
                { label: "Website", key: "website" },
                { label: "Landline", key: "landlineNumber" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="form-label">{label}</label>
                  <input
                    type="text"
                    value={(form as unknown as Record<string, string>)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="form-label">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as CustomerStatus }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={handleSubmit} disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
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
            <h3 className="font-bold text-slate-900 mb-2">Delete Customer?</h3>
            <p className="text-sm text-slate-500 mb-6">This will soft-delete the customer record.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
            <div className="p-6 border-b border-slate-100">
              <h2 className="font-bold text-slate-900" style={{ fontFamily: "Sora, sans-serif" }}>Add Contact</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">Contact Type</label>
                <select
                  value={contactForm.type}
                  onChange={(e) => setContactForm({ ...contactForm, type: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Technical">Technical</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Billing">Billing</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              {[
                { label: "Name *", key: "name", type: "text" },
                { label: "Designation", key: "designation", type: "text" },
                { label: "Email *", key: "email", type: "email" },
                { label: "Phone", key: "phone", type: "text" },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="form-label">{label}</label>
                  <input
                    type={type}
                    value={(contactForm as Record<string, string>)[key]}
                    onChange={(e) => setContactForm({ ...contactForm, [key]: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowContactModal(null)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={handleCreateContact} disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {loading ? "Adding..." : "Add Contact"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
