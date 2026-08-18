import * as React from "react"
import { Outlet } from "react-router-dom"

import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
