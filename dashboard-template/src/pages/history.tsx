import { useEffect, useMemo, useState } from "react"
import {
  FilePlus2,
  History as HistoryIcon,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { serviceRequestFieldLabels } from "@/data/service-request-field-labels"
import { useAuth } from "@/hooks/use-auth"
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
  const { staffProfile } = useAuth()
  const isAdmin = staffProfile?.role === "administrador"
  const [changes, setChanges] = useState<Change[] | null>(null)
  const [error, setError] = useState("")
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  async function loadChanges() {
    const { data, error } = await supabase
      .from("service_request_changes")
      .select("*, service_requests(deleted_at)")
      .order("created_at", { ascending: false })

    if (error) {
      setError("No pudimos cargar el historial. Intenta de nuevo más tarde.")
      return
    }

    setChanges(data)
  }

  useEffect(() => {
    loadChanges()
  }, [])

  async function handleRestore(change: Change) {
    setRestoringId(change.id)

    const { error } = await supabase.rpc("restore_service_request", {
      p_service_request_id: change.service_request_id,
    })

    if (!error) await loadChanges()

    setRestoringId(null)
  }

  const filteredChanges = useMemo(() => {
    if (!changes) return changes
    const normalizedQuery = query.trim().toLocaleLowerCase("es")
    if (!normalizedQuery) return changes

    return changes.filter((change) =>
      [change.business_name, change.actor, actionBadge[change.action].label]
        .join(" ")
        .toLocaleLowerCase("es")
        .includes(normalizedQuery)
    )
  }, [changes, query])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Historial</h1>
      </div>

      {changes !== null && changes.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por negocio, usuario o tipo de cambio..."
            className="pl-8"
          />
        </div>
      )}

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

      {changes !== null &&
        changes.length > 0 &&
        filteredChanges?.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <Search className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No encontramos cambios que coincidan con "{query}".
            </p>
          </div>
        )}

      {filteredChanges !== null && filteredChanges.length > 0 && (
        <div className="flex flex-col gap-3">
          {filteredChanges.map((change) => {
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
                      <Badge
                        variant={badge.variant}
                        className="w-28 justify-center"
                      >
                        <badge.icon className="size-3" />
                        {badge.label}
                      </Badge>
                      {change.action === "eliminado" && isStillDeleted && isAdmin && (
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
