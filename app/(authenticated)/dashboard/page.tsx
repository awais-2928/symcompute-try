import { auth } from "@/auth"
import { prisma } from "@/prisma/prisma"
import {
  Server,
  MonitorCheck,
  Users,
  FileText,
  TrendingUp,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
} from "lucide-react"

export default async function DashboardPage() {
  const session = await auth()

  // Fetch organization for this user
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { organizationId: true, name: true }
      })
    : null

  const orgId = user?.organizationId

  if (!orgId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">No organization found. Please contact an administrator.</p>
      </div>
    )
  }

  // Fetch all stats in parallel
  const [
    serverCount,
    activeServerCount,
    vmCount,
    activeVmCount,
    customerCount,
    activeCustomerCount,
    quotationCount,
    pendingQuotations,
    provisioningTasks,
    pendingTasks,
    invoices,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.bareMetalServer.count({ where: { organizationId: orgId } }),
    prisma.bareMetalServer.count({ where: { organizationId: orgId, status: "ACTIVE" } }),
    prisma.vm.count({ where: { organizationId: orgId } }),
    prisma.vm.count({ where: { organizationId: orgId, status: "ACTIVE" } }),
    prisma.customer.count({ where: { organizationId: orgId } }),
    prisma.customer.count({ where: { organizationId: orgId, status: "ACTIVE" } }),
    prisma.quotation.count({ where: { organizationId: orgId } }),
    prisma.quotation.count({ where: { organizationId: orgId, status: "SENT" } }),
    prisma.provisioningTask.count({ where: { organizationId: orgId } }),
    prisma.provisioningTask.count({ where: { organizationId: orgId, status: "PENDING" } }),
    prisma.invoice.findMany({
      where: { organizationId: orgId },
      select: { amountDue: true, amountPaid: true, status: true },
    }),
    prisma.auditLog.findMany({
      where: { organizationId: orgId },
      orderBy: { timestamp: "desc" },
      take: 5,
      include: { user: { select: { name: true } } },
    }),
  ])

  const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.amountPaid), 0)
  const totalOutstanding = invoices.reduce((sum, inv) => sum + (Number(inv.amountDue) - Number(inv.amountPaid)), 0)
  const paidInvoices = invoices.filter((i) => i.status === "PAID").length

  const stats = [
    {
      label: "Total Servers",
      value: serverCount,
      sub: `${activeServerCount} active`,
      icon: Server,
      color: "#2563EB",
      bg: "#EFF6FF",
    },
    {
      label: "Virtual Machines",
      value: vmCount,
      sub: `${activeVmCount} running`,
      icon: MonitorCheck,
      color: "#7C3AED",
      bg: "#F5F3FF",
    },
    {
      label: "Customers",
      value: customerCount,
      sub: `${activeCustomerCount} active`,
      icon: Users,
      color: "#059669",
      bg: "#ECFDF5",
    },
    {
      label: "Quotations",
      value: quotationCount,
      sub: `${pendingQuotations} pending`,
      icon: FileText,
      color: "#D97706",
      bg: "#FFFBEB",
    },
    {
      label: "Provisioning Tasks",
      value: provisioningTasks,
      sub: `${pendingTasks} pending`,
      icon: Activity,
      color: "#DC2626",
      bg: "#FEF2F2",
    },
    {
      label: "Revenue Collected",
      value: `$${totalRevenue.toLocaleString()}`,
      sub: `${paidInvoices} invoices paid`,
      icon: DollarSign,
      color: "#059669",
      bg: "#ECFDF5",
    },
  ]

  const actionColor = {
    CREATE: "#059669",
    UPDATE: "#2563EB",
    DELETE: "#DC2626",
    PROVISION: "#7C3AED",
    UPGRADE: "#D97706",
    MIGRATE: "#0891B2",
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, {user?.name?.split(" ")[0]}. Here&apos;s your infrastructure overview.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span>All systems operational</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="stat-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Sora, sans-serif" }}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
                </div>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: stat.bg }}
                >
                  <Icon size={18} style={{ color: stat.color }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Status */}
        <div className="stat-card">
          <h3 className="font-semibold text-slate-900 mb-4" style={{ fontFamily: "Sora, sans-serif" }}>
            Infrastructure Health
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-500" />
                <span className="text-sm text-slate-700">Active Servers</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">{activeServerCount}/{serverCount}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-blue-500" />
                <span className="text-sm text-slate-700">Running VMs</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">{activeVmCount}/{vmCount}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-orange-500" />
                <span className="text-sm text-slate-700">Pending Tasks</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">{pendingTasks}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-red-500" />
                <span className="text-sm text-slate-700">Outstanding Invoices</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">${totalOutstanding.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900" style={{ fontFamily: "Sora, sans-serif" }}>
              Recent Activity
            </h3>
            <span className="text-xs text-slate-400">Last 5 actions</span>
          </div>
          {recentAuditLogs.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-slate-400 text-sm">
              No activity recorded yet
            </div>
          ) : (
            <div className="space-y-3">
              {recentAuditLogs.map((log) => {
                const color = actionColor[log.action] || "#6B7280"
                return (
                  <div key={log.id} className="flex items-start gap-3">
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-white text-xs font-bold mt-0.5"
                      style={{ background: color }}
                    >
                      {log.action.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">{log.user?.name || "System"}</span>
                        {" "}
                        <span style={{ color }}>{log.action.toLowerCase()}</span>
                        {" "}
                        <span className="text-slate-500">{log.entityName}</span>
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Financial Overview */}
      <div className="mt-6 stat-card">
        <h3 className="font-semibold text-slate-900 mb-4" style={{ fontFamily: "Sora, sans-serif" }}>
          Financial Overview
        </h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total Revenue</p>
            <p className="text-xl font-bold text-green-600" style={{ fontFamily: "Sora, sans-serif" }}>
              ${totalRevenue.toLocaleString()}
            </p>
          </div>
          <div className="text-center border-x border-slate-100">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Outstanding</p>
            <p className="text-xl font-bold text-orange-500" style={{ fontFamily: "Sora, sans-serif" }}>
              ${totalOutstanding.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Invoices Paid</p>
            <p className="text-xl font-bold text-blue-600" style={{ fontFamily: "Sora, sans-serif" }}>
              {paidInvoices}/{invoices.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
