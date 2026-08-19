import { useEffect, useState } from "react"
import {
  FilePlus2,
  History as HistoryIcon,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { serviceRequestFieldLabels } from "@/data/service-request-field-labels"
import { supabase } from "@/lib/supabase"

type ChangeAction = "creado" | "editado" | "eliminado" | "restaurado"

type Change = {
  id: string
  created_at: string
  service_request_id: string
  business_name: string
  action: ChangeAction
  actor: string
  changed_fields: Record<string, { from: unknown; to: unknown }> | null
  service_requests: { deleted_at: string | null } | null
}

const actionBadge: Record<
  ChangeAction,
  { label: string; variant: "success" | "secondary" | "destructive" | "outline"; icon: typeof FilePlus2 }
> = {
  creado: { label: "Creado", variant: "success", icon: FilePlus2 },
  editado: { label: "Editado", variant: "secondary", icon: Pencil },
  eliminado: { label: "Eliminado", variant: "destructive", icon: Trash2 },
  restaurado: { label: "Restaurado", variant: "outline", icon: RotateCcw },
}

function formatDateTime(isoDate: string) {
  return new Date(isoDate).toLocaleString("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—"
  if (Array.isArray(value)) return value.join(", ")
  return String(value)
}

export default function HistoryPage() {
  const [changes, setChanges] = useState<Change[] | null>(null)
  const [error, setError] = useState("")
  const [restoringId, setRestoringId] = useState<string | null>(null)

  async function loadChanges() {
    const { data, error } = await supabase
      .from("service_request_changes")
      .select("*, service_requests(deleted_at)")
      .order("created_at", { ascending: false })

    if (error) {
      setError("No pudimos cargar el historial. Intentá de nuevo más tarde.")
      return
    }

    setChanges(data)
  }

  useEffect(() => {
    loadChanges()
  }, [])

  async function handleRestore(change: Change) {
    setRestoringId(change.id)

    const { error } = await supabase
      .from("service_requests")
      .update({ deleted_at: null })
      .eq("id", change.service_request_id)

    if (!error) {
      await supabase.from("service_request_changes").insert({
        service_request_id: change.service_request_id,
        business_name: change.business_name,
        action: "restaurado",
      })
      await loadChanges()
    }

    setRestoringId(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Historial</h1>
        <p className="text-sm text-muted-foreground">
          Todos los cambios hechos sobre los clientes.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!error && changes === null && (
        <p className="text-sm text-muted-foreground">Cargando historial...</p>
      )}

      {changes !== null && changes.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <HistoryIcon className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Todavía no hay cambios registrados.
          </p>
        </div>
      )}

      {changes !== null && changes.length > 0 && (
        <div className="flex flex-col gap-3">
          {changes.map((change) => {
            const badge = actionBadge[change.action]
            const isStillDeleted =
              change.service_requests?.deleted_at !== null &&
              change.service_requests?.deleted_at !== undefined
            const fieldEntries = Object.entries(change.changed_fields ?? {})

            return (
              <Card key={change.id}>
                <CardContent className="flex flex-col gap-3 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs">
                          {change.actor.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {change.actor}{" "}
                          <span className="font-normal text-muted-foreground">
                            · {formatDateTime(change.created_at)}
                          </span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {change.business_name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={badge.variant}>
                        <badge.icon className="size-3" />
                        {badge.label}
                      </Badge>
                      {change.action === "eliminado" && isStillDeleted && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestore(change)}
                          disabled={restoringId === change.id}
                        >
                          <RotateCcw className="size-3.5" />
                          {restoringId === change.id
                            ? "Revirtiendo..."
                            : "Revertir"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {fieldEntries.length > 0 && (
                    <div className="flex flex-col gap-1 rounded-md bg-muted/40 px-3 py-2 text-xs">
                      {fieldEntries.map(([field, diff]) => (
                        <div key={field}>
                          <span className="font-medium">
                            {serviceRequestFieldLabels[field] ?? field}:
                          </span>{" "}
                          <span className="text-muted-foreground line-through">
                            {formatValue(diff.from)}
                          </span>{" "}
                          → {formatValue(diff.to)}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
