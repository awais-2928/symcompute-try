"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard,
  Server,
  MonitorCheck,
  Users,
  FileText,
  Briefcase,
  Settings2,
  KeyRound,
  LogOut,
  Network,
  ChevronRight,
  FileBarChart2,
  History,
  FileCheck,
} from "lucide-react"

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Server Management",
    href: "/servers",
    icon: Server,
  },
  {
    label: "VM & IP Management",
    href: "/vms",
    icon: MonitorCheck,
  },
  {
    label: "Customer Management",
    href: "/customers",
    icon: Users,
  },
  {
    label: "Quotations",
    href: "/quotations",
    icon: FileText,
  },
  {
    label: "Purchase Orders",
    href: "/purchase-orders",
    icon: FileCheck,
  },
  {
    label: "Provisioning",
    href: "/provisioning",
    icon: Briefcase,
  },
  {
    label: "IP Addresses",
    href: "/ip-addresses",
    icon: Network,
  },
  {
    label: "Invoices",
    href: "/invoices",
    icon: FileBarChart2,
  },
]

const adminItems = [
  {
    label: "Role Management",
    href: "/roles",
    icon: KeyRound,
  },
  {
    label: "Staff Management",
    href: "/staff",
    icon: Settings2,
  },
  {
    label: "Audit Logs",
    href: "/audit-logs",
    icon: History,
  },
]

interface SidebarClientProps {
  userName: string
  userRole: string
}

export default function SidebarClient({ userName, userRole }: SidebarClientProps) {
  const pathname = usePathname()

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" })
  }

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--brand-sidebar)" }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-6 py-5"
        style={{ borderBottom: "1px solid var(--brand-border)" }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--brand-blue)" }}
        >
          <span className="text-white font-bold text-sm">SC</span>
        </div>
        <div>
          <p className="font-bold text-white text-sm" style={{ fontFamily: "Sora, sans-serif" }}>
            SymCompute
          </p>
          <p className="text-xs" style={{ color: "var(--brand-text-muted)" }}>
            Infrastructure
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="mb-1 px-4 pb-1">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--brand-text-muted)" }}>
            Main
          </p>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${active ? "active" : ""}`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
              {active && <ChevronRight size={12} className="ml-auto opacity-60" />}
            </Link>
          )
        })}

        <div className="mt-4 mb-1 px-4 pb-1">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--brand-text-muted)" }}>
            Administration
          </p>
        </div>

        {adminItems.map((item) => {
          if (item.label === "Audit Logs" && userRole !== "Super Admin") return null;
          
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${active ? "active" : ""}`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
              {active && <ChevronRight size={12} className="ml-auto opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* User Profile */}
      <div style={{ borderTop: "1px solid var(--brand-border)" }} className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
            style={{ background: "var(--brand-blue)" }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <p className="text-xs truncate" style={{ color: "var(--brand-text-muted)" }}>
              {userRole}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: "var(--brand-text-muted)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--brand-sidebar-hover)"
            e.currentTarget.style.color = "#EF4444"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent"
            e.currentTarget.style.color = "var(--brand-text-muted)"
          }}
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )
}
