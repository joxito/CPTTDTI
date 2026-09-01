import { useEffect, useMemo, useState } from "react"
import {
  FilePlus2,
  History as HistoryIcon,
  Pencil,
  RotateCcw,
  Search,
  StickyNote,
  Trash2,
  X,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

type Note = {
  id: string
  created_at: string
  client_id: string | null
  service_request_id: string | null
  author: string
  body: string
  clients: { business_name: string } | null
  service_requests: {
    sector: string | null
    sector_other: string | null
    clients: { business_name: string } | null
  } | null
}

function noteBusinessName(note: Note) {
  return (
    note.clients?.business_name ??
    note.service_requests?.clients?.business_name ??
    "—"
  )
}

function noteScopeLabel(note: Note) {
  if (note.client_id) return "Cliente"
  const service = note.service_requests
  if (!service) return "Servicio"
  const sector =
    service.sector === "Otro" ? service.sector_other : service.sector
  return sector ? `Servicio: ${sector}` : "Servicio"
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

  const [notes, setNotes] = useState<Note[] | null>(null)
  const [notesError, setNotesError] = useState("")
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)
  const [noteQuery, setNoteQuery] = useState("")

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

  async function loadNotes() {
    const { data, error } = await supabase
      .from("notes")
      .select(
        "id, created_at, client_id, service_request_id, author, body, clients:client_id(business_name), service_requests:service_request_id(sector, sector_other, clients(business_name))"
      )
      .order("created_at", { ascending: false })

    if (error) {
      setNotesError("No pudimos cargar la bitácora. Intenta de nuevo más tarde.")
      return
    }

    setNotes(data as unknown as Note[])
  }

  useEffect(() => {
    loadChanges()
    loadNotes()
  }, [])

  async function handleDeleteNote(noteId: string) {
    setDeletingNoteId(noteId)

    const { error } = await supabase.from("notes").delete().eq("id", noteId)

    setDeletingNoteId(null)

    if (error) {
      setNotesError("No pudimos eliminar la nota. Intenta de nuevo.")
      return
    }

    setNotes((current) => current?.filter((note) => note.id !== noteId) ?? current)
  }

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

  const filteredNotes = useMemo(() => {
    if (!notes) return notes
    const normalizedQuery = noteQuery.trim().toLocaleLowerCase("es")
    if (!normalizedQuery) return notes

    return notes.filter((note) =>
      [noteBusinessName(note), note.author, note.body]
        .join(" ")
        .toLocaleLowerCase("es")
        .includes(normalizedQuery)
    )
  }, [notes, noteQuery])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Historial</h1>
      </div>

      <Tabs defaultValue="cambios">
        <TabsList>
          <TabsTrigger value="cambios">Cambios</TabsTrigger>
          <TabsTrigger value="bitacora">Bitácora</TabsTrigger>
        </TabsList>

        <TabsContent value="cambios" className="flex flex-col gap-6">
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
            <p className="text-sm text-muted-foreground">
              Cargando historial...
            </p>
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
        </TabsContent>

        <TabsContent value="bitacora" className="flex flex-col gap-6">
          {notes !== null && notes.length > 0 && (
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={noteQuery}
                onChange={(event) => setNoteQuery(event.target.value)}
                placeholder="Buscar por negocio, autor o contenido..."
                className="pl-8"
              />
            </div>
          )}

          {notesError && <p className="text-sm text-destructive">{notesError}</p>}

          {!notesError && notes === null && (
            <p className="text-sm text-muted-foreground">
              Cargando bitácora...
            </p>
          )}

          {notes !== null && notes.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
              <StickyNote className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Todavía no hay notas registradas.
              </p>
            </div>
          )}

          {notes !== null &&
            notes.length > 0 &&
            filteredNotes?.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
                <Search className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No encontramos notas que coincidan con "{noteQuery}".
                </p>
              </div>
            )}

          {filteredNotes !== null && filteredNotes.length > 0 && (
            <div className="flex flex-col gap-3">
              {filteredNotes.map((note) => (
                <Card key={note.id}>
                  <CardContent className="flex flex-col gap-2 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="text-xs">
                            {note.author.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {note.author}{" "}
                            <span className="font-normal text-muted-foreground">
                              · {formatDateTime(note.created_at)}
                            </span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {noteBusinessName(note)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{noteScopeLabel(note)}</Badge>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id)}
                          disabled={deletingNoteId === note.id}
                          aria-label="Eliminar nota"
                          className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm">{note.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
