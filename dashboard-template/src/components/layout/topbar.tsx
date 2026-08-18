import { Bell, Menu, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/layout/theme-toggle"

type TopbarProps = {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </Button>

      <div className="relative hidden flex-1 max-w-sm sm:block">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Buscar..."
          className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />

        <Button variant="outline" size="icon" aria-label="Notificaciones">
          <Bell className="size-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
              <Avatar>
                <AvatarFallback>TU</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Perfil</DropdownMenuItem>
            <DropdownMenuItem>Configuración</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Cerrar sesión</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
