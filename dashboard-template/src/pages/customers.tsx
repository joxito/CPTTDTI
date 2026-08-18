import { useEffect, useState } from "react"
import {
  Building2,
  Calendar,
  Mail,
  MapPin,
  Phone,
  Users,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"

type ServiceRequest = {
  id: string
  created_at: string
  business_name: string
  representative_name: string
  phone: string
  email: string
  province: string
  municipality: string
  sector: string
  sector_other: string | null
  services: string[]
}

function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export default function CustomersPage() {
  const [requests, setRequests] = useState<ServiceRequest[] | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadRequests() {
      const { data, error } = await supabase
        .from("service_requests")
        .select(
          "id, created_at, business_name, representative_name, phone, email, province, municipality, sector, sector_other, services"
        )
        .order("created_at", { ascending: false })

      if (cancelled) return

      if (error) {
        setError("No pudimos cargar los clientes. Intentá de nuevo más tarde.")
        return
      }

      setRequests(data)
    }

    loadRequests()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <p className="text-sm text-muted-foreground">
          Solicitudes de servicios recibidas a través del formulario.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!error && requests === null && (
        <p className="text-sm text-muted-foreground">Cargando clientes...</p>
      )}

      {requests !== null && requests.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Users className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Todavía no hay solicitudes de clientes.
          </p>
        </div>
      )}

      {requests !== null && requests.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="size-4" />
                </div>
                <CardTitle className="mt-2 text-base">
                  {request.business_name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {request.representative_name}
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 pb-6 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-3.5 shrink-0" />
                  <span className="truncate">{request.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-3.5 shrink-0" />
                  <span className="truncate">{request.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" />
                  <span className="truncate">
                    {request.municipality}, {request.province}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="size-3.5 shrink-0" />
                  <span>{formatDate(request.created_at)}</span>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="secondary">
                    {request.sector === "Otro"
                      ? request.sector_other
                      : request.sector}
                  </Badge>
                  {request.services.slice(0, 2).map((service) => (
                    <Badge key={service} variant="outline">
                      {service}
                    </Badge>
                  ))}
                  {request.services.length > 2 && (
                    <Badge variant="outline">
                      +{request.services.length - 2}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
