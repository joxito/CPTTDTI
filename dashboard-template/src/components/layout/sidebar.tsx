import { useState } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  Users,
  UserCog,
  Settings,
  ClipboardList,
  FileText,
  Star,
  FileSignature,
  Briefcase,
  History,
  LogOut,
  Folder,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/use-auth"
import { initialsFromName } from "@/lib/format"

const topNavItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/customers", label: "Clientes", icon: Users },
  { to: "/servicios", label: "Servicios", icon: Briefcase },
]

const formNavItems = [
  {
    to: "/solicitud-servicios",
    label: "Solicitud de Servicios",
    icon: ClipboardList,
  },
  {
    to: "/encuesta-satisfaccion",
    label: "Encuesta de Satisfacción",
    icon: Star,
  },
  {
    to: "/acuerdo-finalizacion",
    label: "Acuerdo de Finalización",
    icon: FileSignature,
  },
]

const formPlaceholders = ["Formulario 4"]

const bottomNavItems = [
  { to: "/historial", label: "Historial", icon: History },
  { to: "/usuarios", label: "Usuarios", icon: UserCog },
  { to: "/settings", label: "Configuración", icon: Settings },
]

type SidebarProps = {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const navigate = useNavigate()
  const { staffProfile, signOut } = useAuth()
  const [formsOpen, setFormsOpen] = useState(true)

  async function handleSignOut() {
    await signOut()
    navigate("/login", { replace: true })
  }

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
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-sidebar text-sidebar-foreground transition-transform print:hidden lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex items-center gap-2 font-semibold">
            <span>CPTTL</span>
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
          {topNavItems.map((item) => (
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

          <button
            type="button"
            onClick={() => setFormsOpen((current) => !current)}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <Folder className="size-4" />
            Formularios
          </button>
          {formsOpen && (
            <div className="ml-3 flex flex-col gap-1 border-l border-sidebar-border pl-2">
              {formNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )
                  }
                >
                  <item.icon className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
              {formPlaceholders.map((label) => (
                <div
                  key={label}
                  className="flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-sidebar-foreground/30"
                >
                  <FileText className="size-4 shrink-0" />
                  <span className="flex-1 truncate">{label}</span>
                  <span className="shrink-0 text-xs">Próximamente</span>
                </div>
              ))}
            </div>
          )}

          {bottomNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
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

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <Avatar>
              {staffProfile?.photo && <AvatarImage src={staffProfile.photo} />}
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                {initialsFromName(staffProfile?.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">
                {staffProfile?.name ?? "..."}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/60 capitalize">
                {staffProfile?.role ?? ""}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label="Cerrar sesión"
              onClick={handleSignOut}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
