import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileSignature,
  Star,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"

type ServiceRow = {
  id: string
  status: "iniciado" | "en_proceso" | "completo"
  signature: string | null
  sector: string
  sector_other: string | null
  created_at: string
  clients: { business_name: string } | null
}

function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function sectorLabel(request: ServiceRow) {
  return request.sector === "Otro" ? request.sector_other : request.sector
}

const statusBadge: Record<
  ServiceRow["status"],
  { label: string; variant: "outline" | "secondary" | "success" }
> = {
  iniciado: { label: "Inició", variant: "outline" },
  en_proceso: { label: "En proceso", variant: "secondary" },
  completo: { label: "Completo", variant: "success" },
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState<ServiceRow[] | null>(null)
  const [actionServiceIds, setActionServiceIds] = useState<Set<string> | null>(
    null
  )
  const [completionServiceIds, setCompletionServiceIds] = useState<
    Set<string> | null
  >(null)
  const [surveyServiceIds, setSurveyServiceIds] = useState<Set<string> | null>(
    null
  )
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      const [requestsRes, actionRes, completionRes, surveyRes] =
        await Promise.all([
          supabase
            .from("service_requests")
            .select(
              "id, status, signature, sector, sector_other, created_at, clients(business_name)"
            )
            .is("deleted_at", null),
          supabase.from("project_action_agreements").select("service_request_id"),
          supabase.from("completion_agreements").select("service_request_id"),
          supabase
            .from("satisfaction_surveys")
            .select("service_request_id")
            .not("service_request_id", "is", null),
        ])

      if (
        requestsRes.error ||
        actionRes.error ||
        completionRes.error ||
        surveyRes.error
      ) {
        setError("No pudimos cargar el resumen. Intenta de nuevo más tarde.")
        return
      }

      setRequests(requestsRes.data as unknown as ServiceRow[])
      setActionServiceIds(
        new Set(actionRes.data?.map((row) => row.service_request_id))
      )
      setCompletionServiceIds(
        new Set(completionRes.data?.map((row) => row.service_request_id))
      )
      setSurveyServiceIds(
        new Set(surveyRes.data?.map((row) => row.service_request_id))
      )
    }

    load()
  }, [])

  const loaded =
    requests !== null &&
    actionServiceIds !== null &&
    completionServiceIds !== null &&
    surveyServiceIds !== null

  const counts = useMemo(() => {
    if (!requests) return null
    return {
      iniciado: requests.filter((r) => r.status === "iniciado").length,
      en_proceso: requests.filter((r) => r.status === "en_proceso").length,
      completo: requests.filter((r) => r.status === "completo").length,
      sinFirmar: requests.filter((r) => !r.signature).length,
    }
  }, [requests])

  const unsigned = useMemo(() => {
    if (!requests) return []
    return requests
      .filter((r) => !r.signature)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
  }, [requests])

  const surveysPending = useMemo(() => {
    if (!requests || !surveyServiceIds) return []
    return requests
      .filter((r) => r.status === "completo" && !surveyServiceIds.has(r.id))
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
  }, [requests, surveyServiceIds])

  const missingActionAgreement = useMemo(() => {
    if (!requests || !actionServiceIds) return []
    return requests.filter(
      (r) =>
        (r.status === "en_proceso" || r.status === "completo") &&
        !actionServiceIds.has(r.id)
    )
  }, [requests, actionServiceIds])

  const missingCompletionAgreement = useMemo(() => {
    if (!requests || !completionServiceIds) return []
    return requests.filter(
      (r) => r.status === "completo" && !completionServiceIds.has(r.id)
    )
  }, [requests, completionServiceIds])

  function openService(id: string) {
    navigate(`/servicios?id=${id}`)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Resumen</h1>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!error && !loaded && (
        <p className="text-sm text-muted-foreground">Cargando resumen...</p>
      )}

      {!error && loaded && counts && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card>
              <CardContent className="flex flex-col gap-1 py-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Inició
                </p>
                <p className="text-2xl font-semibold">{counts.iniciado}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col gap-1 py-4">
                <p className="text-xs font-medium text-muted-foreground">
                  En proceso
                </p>
                <p className="text-2xl font-semibold">{counts.en_proceso}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col gap-1 py-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Completo
                </p>
                <p className="text-2xl font-semibold">{counts.completo}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col gap-1 py-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Sin firmar
                </p>
                <p className="text-2xl font-semibold">{counts.sinFirmar}</p>
              </CardContent>
            </Card>
          </div>

          {(missingActionAgreement.length > 0 ||
            missingCompletionAgreement.length > 0) && (
            <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="size-4" />
                Estado sin acuerdo de respaldo
              </div>
              <div className="flex flex-col gap-1">
                {missingActionAgreement.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => openService(r.id)}
                    className="text-left text-sm text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {r.clients?.business_name} — "{statusBadge[r.status].label}"
                    sin Acuerdo de Acciones
                  </button>
                ))}
                {missingCompletionAgreement.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => openService(r.id)}
                    className="text-left text-sm text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {r.clients?.business_name} — "Completo" sin Acuerdo de
                    Finalización
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="flex flex-col gap-3 py-4">
                <div className="flex items-center gap-2">
                  <FileSignature className="size-4 text-muted-foreground" />
                  <p className="text-sm font-semibold">
                    Solicitudes sin firmar
                  </p>
                </div>

                {unsigned.length === 0 && (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-4" />
                    Todas las solicitudes están firmadas.
                  </div>
                )}

                {unsigned.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {unsigned.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => openService(r.id)}
                        className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">
                            {r.clients?.business_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {sectorLabel(r)} · {formatDate(r.created_at)}
                          </span>
                        </div>
                        <Badge variant={statusBadge[r.status].variant}>
                          {statusBadge[r.status].label}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col gap-3 py-4">
                <div className="flex items-center gap-2">
                  <Star className="size-4 text-muted-foreground" />
                  <p className="text-sm font-semibold">Encuestas pendientes</p>
                </div>

                {surveysPending.length === 0 && (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-4" />
                    Todos los servicios completos tienen encuesta.
                  </div>
                )}

                {surveysPending.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {surveysPending.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => openService(r.id)}
                        className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">
                            {r.clients?.business_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {sectorLabel(r)} · {formatDate(r.created_at)}
                          </span>
                        </div>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {requests.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
              <ClipboardList className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Todavía no hay solicitudes de servicios.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
