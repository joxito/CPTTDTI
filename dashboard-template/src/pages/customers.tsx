import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowRight,
  Building2,
  Calendar,
  Mail,
  MapPin,
  PenOff,
  Phone,
  Search,
  StickyNote,
  Users,
  X,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sheet } from "@/components/ui/sheet"
import { serviceStatusOptions } from "@/data/service-request-options"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"

type Client = {
  id: string
  business_name: string
  has_rnc: string
  rnc_number: string | null
  province: string
  municipality: string
  representative_name: string
  sex: string
  age: number
  phone: string
  is_owner: string
  id_number: string
  email: string
  address: string | null
}

type ServiceRequest = {
  id: string
  created_at: string
  client_id: string
  sector: string
  sector_other: string | null
  business_description: string
  services: string[]
  signature: string | null
  status: string
}

type ClientGroup = {
  client: Client
  services: ServiceRequest[]
}

type Note = {
  id: string
  created_at: string
  client_id: string | null
  service_request_id: string | null
  author: string
  body: string
}

const PAGE_SIZE = 15

function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function serviceStatusLabel(status: string) {
  return (
    serviceStatusOptions.find((option) => option.value === status)?.label ??
    status
  )
}

function serviceStatusBadgeVariant(status: string) {
  if (status === "completo") return "success" as const
  if (status === "en_proceso") return "secondary" as const
  return "outline" as const
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <span className="text-sm">{value || "—"}</span>
    </div>
  )
}

export default function CustomersPage() {
  const navigate = useNavigate()
  const { staffProfile } = useAuth()
  const [requests, setRequests] = useState<
    (ServiceRequest & { clients: Client })[] | null
  >(null)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Note[] | null>(null)
  const [notesError, setNotesError] = useState("")
  const [newNoteBody, setNewNoteBody] = useState("")
  const [addingNote, setAddingNote] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadRequests() {
      const { data, error } = await supabase
        .from("service_requests")
        .select(
          "id, created_at, client_id, sector, sector_other, business_description, services, signature, status, clients(id, business_name, has_rnc, rnc_number, province, municipality, representative_name, sex, age, phone, is_owner, id_number, email, address)"
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false })

      if (cancelled) return

      if (error) {
        setError("No pudimos cargar los clientes. Intenta de nuevo más tarde.")
        return
      }

      setRequests(data as unknown as (ServiceRequest & { clients: Client })[])
    }

    loadRequests()
    return () => {
      cancelled = true
    }
  }, [])

  const clientGroups = useMemo(() => {
    const map = new Map<string, ClientGroup>()
    for (const request of requests ?? []) {
      const existing = map.get(request.client_id)
      if (existing) {
        existing.services.push(request)
      } else {
        map.set(request.client_id, {
          client: request.clients,
          services: [request],
        })
      }
    }
    return map
  }, [requests])

  const filteredGroups = useMemo(() => {
    const groups = Array.from(clientGroups.values())
    const normalizedQuery = query.trim().toLocaleLowerCase("es")
    if (!normalizedQuery) return groups

    return groups.filter((group) =>
      [
        group.client.business_name,
        group.client.representative_name,
        group.client.email,
        group.client.phone,
        group.client.province,
        group.client.municipality,
      ]
        .join(" ")
        .toLocaleLowerCase("es")
        .includes(normalizedQuery)
    )
  }, [clientGroups, query])

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedGroups = filteredGroups.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  const selectedGroup = selectedClientId
    ? clientGroups.get(selectedClientId) ?? null
    : null

  async function loadClientNotes(clientId: string, serviceIds: string[]) {
    setNotes(null)
    setNotesError("")

    const [byClient, byServices] = await Promise.all([
      supabase
        .from("notes")
        .select("id, created_at, client_id, service_request_id, author, body")
        .eq("client_id", clientId),
      serviceIds.length > 0
        ? supabase
            .from("notes")
            .select("id, created_at, client_id, service_request_id, author, body")
            .in("service_request_id", serviceIds)
        : Promise.resolve({ data: [] as Note[], error: null }),
    ])

    if (byClient.error || byServices.error) {
      setNotesError("No pudimos cargar la bitácora.")
      return
    }

    const merged = [...(byClient.data ?? []), ...(byServices.data ?? [])].sort(
      (a, b) => b.created_at.localeCompare(a.created_at)
    )
    setNotes(merged)
  }

  function openClient(clientId: string, serviceIds: string[]) {
    setSelectedClientId(clientId)
    setNewNoteBody("")
    loadClientNotes(clientId, serviceIds)
  }

  function closeSheet() {
    setSelectedClientId(null)
    setNotes(null)
    setNotesError("")
    setNewNoteBody("")
  }

  async function handleAddNote() {
    if (!selectedClientId || !newNoteBody.trim()) return

    setAddingNote(true)
    setNotesError("")

    const { data, error } = await supabase
      .from("notes")
      .insert({
        client_id: selectedClientId,
        body: newNoteBody.trim(),
        author: staffProfile?.name ?? "Usuario",
      })
      .select("id, created_at, client_id, service_request_id, author, body")
      .single()

    setAddingNote(false)

    if (error || !data) {
      setNotesError("No pudimos guardar la nota. Intenta de nuevo.")
      return
    }

    setNotes((current) => [data, ...(current ?? [])])
    setNewNoteBody("")
  }

  async function handleDeleteNote(noteId: string) {
    const { error } = await supabase.from("notes").delete().eq("id", noteId)
    if (error) {
      setNotesError("No pudimos eliminar la nota. Intenta de nuevo.")
      return
    }
    setNotes((current) => current?.filter((note) => note.id !== noteId) ?? current)
  }

  function goToService(serviceId: string) {
    navigate(`/servicios?id=${serviceId}`)
  }

  function noteScopeLabel(note: Note) {
    if (note.client_id) return "Cliente"
    const service = selectedGroup?.services.find(
      (item) => item.id === note.service_request_id
    )
    if (!service) return "Servicio"
    const sector =
      service.sector === "Otro" ? service.sector_other : service.sector
    return `Servicio: ${sector} (${formatDate(service.created_at)})`
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
      </div>

      {clientGroups.size > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder="Buscar por negocio, representante, correo..."
            className="pl-8"
          />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!error && requests === null && (
        <p className="text-sm text-muted-foreground">Cargando clientes...</p>
      )}

      {requests !== null && clientGroups.size === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Users className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Todavía no hay clientes.
          </p>
        </div>
      )}

      {requests !== null &&
        clientGroups.size > 0 &&
        filteredGroups.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <Search className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No encontramos clientes que coincidan con "{query}".
            </p>
          </div>
        )}

      {filteredGroups.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedGroups.map((group) => {
            const hasUnsigned = group.services.some(
              (service) => !service.signature
            )
            return (
              <Card
                key={group.client.id}
                role="button"
                tabIndex={0}
                onClick={() =>
                  openClient(
                    group.client.id,
                    group.services.map((service) => service.id)
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    openClient(
                      group.client.id,
                      group.services.map((service) => service.id)
                    )
                  }
                }}
                className="cursor-pointer transition-colors hover:border-primary/50"
              >
                <CardHeader>
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="size-4" />
                  </div>
                  <CardTitle className="mt-2 text-base">
                    {group.client.business_name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {group.client.representative_name}
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 pb-6 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="size-3.5 shrink-0" />
                    <span className="truncate">{group.client.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="size-3.5 shrink-0" />
                    <span className="truncate">{group.client.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="truncate">
                      {group.client.municipality}, {group.client.province}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {hasUnsigned && (
                      <Badge variant="destructive">
                        <PenOff className="size-3" />
                        Sin firmar
                      </Badge>
                    )}
                    <Badge variant="outline">
                      {group.services.length > 1 ? "Recurrente" : "Nuevo"}
                    </Badge>
                    <Badge variant="secondary">
                      {group.services.length}{" "}
                      {group.services.length === 1 ? "servicio" : "servicios"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {filteredGroups.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages} — {filteredGroups.length}{" "}
            clientes
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={currentPage === totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <Sheet
        open={selectedGroup !== null}
        onClose={closeSheet}
        title={selectedGroup?.client.business_name}
        description={selectedGroup?.client.representative_name}
      >
        {selectedGroup && (
          <div className="flex flex-col gap-4">
            <DetailRow
              label="Nombre del Negocio o Emprendimiento"
              value={selectedGroup.client.business_name}
            />
            <DetailRow
              label="¿Posee RNC?"
              value={selectedGroup.client.has_rnc === "si" ? "Sí" : "No"}
            />
            {selectedGroup.client.has_rnc === "si" && (
              <DetailRow
                label="Número de RNC"
                value={selectedGroup.client.rnc_number}
              />
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailRow
                label="Provincia"
                value={selectedGroup.client.province}
              />
              <DetailRow
                label="Municipio"
                value={selectedGroup.client.municipality}
              />
            </div>
            <DetailRow
              label="Representante"
              value={selectedGroup.client.representative_name}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailRow
                label="Sexo"
                value={
                  selectedGroup.client.sex === "femenino"
                    ? "Femenino"
                    : "Masculino"
                }
              />
              <DetailRow label="Edad" value={selectedGroup.client.age} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailRow label="Teléfono" value={selectedGroup.client.phone} />
              <DetailRow
                label="¿Es dueño de la empresa?"
                value={selectedGroup.client.is_owner === "si" ? "Sí" : "No"}
              />
            </div>
            <DetailRow
              label="Número de Cédula de Identidad y Electoral"
              value={selectedGroup.client.id_number}
            />
            <DetailRow
              label="Correo Electrónico"
              value={selectedGroup.client.email}
            />
            <DetailRow label="Dirección" value={selectedGroup.client.address} />

            <div className="flex flex-col gap-2 border-t pt-4">
              <span className="text-sm font-semibold">
                Servicios ({selectedGroup.services.length})
              </span>
              <div className="flex flex-col gap-2">
                {selectedGroup.services.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => goToService(service.id)}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors hover:border-primary/50 hover:bg-muted/40"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">
                        {service.sector === "Otro"
                          ? service.sector_other
                          : service.sector}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={serviceStatusBadgeVariant(service.status)}>
                          {serviceStatusLabel(service.status)}
                        </Badge>
                        {!service.signature && (
                          <Badge variant="destructive">
                            <PenOff className="size-3" />
                            Sin firmar
                          </Badge>
                        )}
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="size-3" />
                          {formatDate(service.created_at)}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t pt-4">
              <div className="flex items-center gap-2">
                <StickyNote className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Bitácora</span>
              </div>

              <div className="flex flex-col gap-2">
                <Textarea
                  value={newNoteBody}
                  onChange={(event) => setNewNoteBody(event.target.value)}
                  placeholder="Agrega una nota..."
                  className="min-h-16"
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddNote}
                    disabled={addingNote || !newNoteBody.trim()}
                  >
                    {addingNote ? "Guardando..." : "Agregar nota"}
                  </Button>
                </div>
              </div>

              {notesError && (
                <p className="text-sm text-destructive">{notesError}</p>
              )}

              {notes === null && !notesError && (
                <p className="text-xs text-muted-foreground">
                  Cargando bitácora...
                </p>
              )}

              {notes !== null && notes.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Todavía no hay notas.
                </p>
              )}

              {notes !== null && notes.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {notes.map((note) => (
                    <li
                      key={note.id}
                      className="flex flex-col gap-1 rounded-md border bg-muted/30 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {note.author}
                          </span>
                          <span>
                            ·{" "}
                            {new Date(note.created_at).toLocaleString(
                              "es-DO",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                          <Badge variant="outline">{noteScopeLabel(note)}</Badge>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id)}
                          aria-label="Eliminar nota"
                          className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                      <p className="text-sm">{note.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
