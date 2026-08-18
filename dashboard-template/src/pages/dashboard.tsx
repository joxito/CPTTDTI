import { LayoutDashboard } from "lucide-react"

import { PlaceholderPage } from "@/components/layout/placeholder-page"

export default function DashboardPage() {
  return (
    <PlaceholderPage
      title="Dashboard"
      description="Bienvenido de nuevo. Esto es lo que está pasando con tu negocio hoy."
      icon={LayoutDashboard}
    />
  )
}
