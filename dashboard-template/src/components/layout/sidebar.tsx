import { NavLink } from "react-router-dom"
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  Boxes,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/orders", label: "Órdenes", icon: ShoppingCart },
  { to: "/customers", label: "Clientes", icon: Users },
  { to: "/analytics", label: "Analítica", icon: BarChart3 },
  { to: "/products", label: "Productos", icon: Boxes },
  { to: "/settings", label: "Configuración", icon: Settings },
]

type SidebarProps = {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex items-center gap-2 font-semibold">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Boxes className="size-4" />
            </div>
            <span>Mi Dashboard</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            <X className="size-4" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3 text-xs text-sidebar-foreground/60">
          Plantilla base — reemplazá esto por tu propio contenido.
        </div>
      </aside>
    </>
  )
}
