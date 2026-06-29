"use client"

import { useState } from "react"
import { Search, History, ChevronRight, ChevronDown, Filter } from "lucide-react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

type AuditLogWithUser = {
  id: string
  organizationId: string
  userId: string | null
  action: string
  entityName: string
  entityId: string
  changes: string
  timestamp: Date
  user: { name: string | null; email: string | null } | null
}

type User = { id: string; name: string; email: string }

export default function AuditLogsClient({ 
  logs, 
  users, 
  currentAction, 
  currentUserId 
}: { 
  logs: AuditLogWithUser[]
  users: User[]
  currentAction: string
  currentUserId: string
}) {
  const [search, setSearch] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  const filtered = logs.filter((log) => {
    const s = search.toLowerCase()
    return (
      log.action.toLowerCase().includes(s) ||
      log.entityName.toLowerCase().includes(s) ||
      log.entityId.toLowerCase().includes(s) ||
      (log.user?.name && log.user.name.toLowerCase().includes(s))
    )
  })

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50 justify-between">
        <div className="relative w-full max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search logs by action, entity, or user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-600">Filters:</span>
          </div>
          <select 
            value={currentAction}
            onChange={(e) => handleFilterChange("action", e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="PROVISION">PROVISION</option>
            <option value="UPGRADE">UPGRADE</option>
            <option value="MIGRATE">MIGRATE</option>
          </select>

          <select 
            value={currentUserId}
            onChange={(e) => handleFilterChange("userId", e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px] truncate"
          >
            <option value="">All Users</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <table className="data-table">
        <thead>
          <tr>
            <th className="w-8"></th>
            <th>Timestamp</th>
            <th>User</th>
            <th>Action</th>
            <th>Resource</th>
            <th>Resource ID</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-12 text-slate-400">
                <History size={32} className="mx-auto mb-2 opacity-30" />
                <p>No audit logs found</p>
              </td>
            </tr>
          ) : (
            filtered.map((log) => (
              <>
                <tr key={log.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                  <td>
                    <button className="text-slate-400 hover:text-slate-600">
                      {expandedId === log.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  </td>
                  <td className="text-sm text-slate-600 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td>
                    <div className="font-medium text-slate-900">{log.user?.name || "System"}</div>
                    {log.user?.email && <div className="text-xs text-slate-400">{log.user.email}</div>}
                  </td>
                  <td>
                    <span className={`badge ${
                      log.action === "CREATE" ? "bg-green-100 text-green-700" :
                      log.action === "UPDATE" ? "bg-blue-100 text-blue-700" :
                      log.action === "DELETE" ? "bg-red-100 text-red-700" :
                      "bg-slate-100 text-slate-700"
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="font-medium text-slate-800">{log.entityName}</td>
                  <td className="font-mono text-xs text-slate-500">{log.entityId}</td>
                </tr>
                {expandedId === log.id && (
                  <tr key={`${log.id}-details`} className="bg-slate-50/50">
                    <td colSpan={6} className="p-4">
                      <div className="bg-slate-900 text-slate-200 p-4 rounded-lg overflow-x-auto">
                        <pre className="text-xs font-mono">
                          {JSON.stringify(JSON.parse(log.changes || "{}"), null, 2)}
                        </pre>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
