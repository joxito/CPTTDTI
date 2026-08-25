import { Navigate, Outlet } from "react-router-dom"

import { useAuth } from "@/hooks/use-auth"

export function RequireAuth() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
