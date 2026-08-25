import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import * as XLSX from "xlsx"
import {
  Building2,
  Calendar,
  Check,
  Download,
  Link as LinkIcon,
  Mail,
  MapPin,
  Pencil,
  PenOff,
  Phone,
  Search,
  StickyNote,
  Trash2,
  Users,
  X,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Combobox } from "@/components/ui/combobox"
import { MultiCombobox } from "@/components/ui/multi-combobox"
import { Sheet } from "@/components/ui/sheet"
import { dominicanProvinces } from "@/data/provinces"
import { municipalitiesByProvince } from "@/data/municipalities"
import {
  sectorOptions,
  serviceOptions,
  referralOptions,
  serviceStatusOptions,
} from "@/data/service-request-options"
import { useAuth } from "@/hooks/use-auth"
import { formatCedula, formatPhoneNumber } from "@/lib/format"
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
  start_date: string
  employee_count: number
  services: string[]
  referral: string
  referral_other: string | null
  signature: string | null
  status: string
  clients: Client
}

const CLIENT_FIELD_KEYS = [
  "business_name",
  "has_rnc",
  "rnc_number",
  "province",
  "municipality",
  "representative_name",
  "sex",
  "age",
  "phone",
  "is_owner",
  "id_number",
  "email",
  "address",
] as const

const SERVICE_FIELD_KEYS = [
  "sector",
  "sector_other",
  "business_description",
  "start_date",
  "employee_count",
  "services",
  "referral",
  "referral_other",
  "signature",
  "status",
] as const

type ClientFieldKey = (typeof CLIENT_FIELD_KEYS)[number]
type ServiceFieldKey = (typeof SERVICE_FIELD_KEYS)[number]

type Note = {
  id: string
  created_at: string
  client_id: string | null
  service_request_id: string | null
  author: string
  body: string
}

type EditableFields = Pick<Client, ClientFieldKey> & Pick<ServiceRequest, ServiceFieldKey>

function toEditableFields(request: ServiceRequest): EditableFields {
  return {
    business_name: request.clients.business_name,
    has_rnc: request.clients.has_rnc,
    rnc_number: request.clients.rnc_number,
    province: request.clients.province,
    municipality: request.clients.municipality,
    representative_name: request.clients.representative_name,
    sex: request.clients.sex,
    age: request.clients.age,
    phone: request.clients.phone,
    is_owner: request.clients.is_owner,
    id_number: request.clients.id_number,
    email: request.clients.email,
    address: request.clients.address,
    sector: request.sector,
    sector_other: request.sector_other,
    business_description: request.business_description,
    start_date: request.start_date,
    employee_count: request.employee_count,
    services: request.services,
    referral: request.referral,
    referral_other: request.referral_other,
    signature: request.signature,
    status: request.status,
  }
}

function flatValue(request: ServiceRequest, key: keyof EditableFields) {
  return (CLIENT_FIELD_KEYS as readonly string[]).includes(key)
    ? request.clients[key as ClientFieldKey]
    : request[key as ServiceFieldKey]
}

function applyEditableFields(
  request: ServiceRequest,
  fields: EditableFields
): ServiceRequest {
  return {
    ...request,
    sector: fields.sector,
    sector_other: fields.sector_other,
    business_description: fields.business_description,
    start_date: fields.start_date,
    employee_count: fields.employee_count,
    services: fields.services,
    referral: fields.referral,
    referral_other: fields.referral_other,
    signature: fields.signature,
    status: fields.status,
    clients: {
      ...request.clients,
      business_name: fields.business_name,
      has_rnc: fields.has_rnc,
      rnc_number: fields.rnc_number,
      province: fields.province,
      municipality: fields.municipality,
      representative_name: fields.representative_name,
      sex: fields.sex,
      age: fields.age,
      phone: fields.phone,
      is_owner: fields.is_owner,
      id_number: fields.id_number,
      email: fields.email,
      address: fields.address,
    },
  }
}

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

type PeriodPreset =
  | "semana"
  | "mes"
  | "trimestre"
  | "cuatrimestre"
  | "semestre"
  | "custom"

const periodPresetOptions: { value: PeriodPreset; label: string }[] = [
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mes" },
  { value: "trimestre", label: "Trimestre" },
  { value: "cuatrimestre", label: "Cuatrimestre" },
  { value: "semestre", label: "Semestre" },
  { value: "custom", label: "Personalizado" },
]

function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Períodos alineados al calendario (no configurables): la semana empieza
// el lunes, y trimestre/cuatrimestre/semestre se calculan desde enero.
function getPeriodRange(period: Exclude<PeriodPreset, "custom">) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  if (period === "semana") {
    const day = now.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    const monday = new Date(year, month, now.getDate() + diffToMonday)
    const sunday = new Date(year, month, monday.getDate() + 6)
    return { from: formatDateInput(monday), to: formatDateInput(sunday) }
  }

  if (period === "mes") {
    return {
      from: formatDateInput(new Date(year, month, 1)),
      to: formatDateInput(new Date(year, month + 1, 0)),
    }
  }

  const spans: Record<Exclude<PeriodPreset, "custom" | "semana" | "mes">, number> = {
    trimestre: 3,
    cuatrimestre: 4,
    semestre: 6,
  }
  const span = spans[period]
  const startMonth = Math.floor(month / span) * span
  return {
    from: formatDateInput(new Date(year, startMonth, 1)),
    to: formatDateInput(new Date(year, startMonth + span, 0)),
  }
}

function downloadXlsx(rows: Record<string, string>[], filename: string) {
  const sheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, "Servicios")
  XLSX.writeFile(workbook, filename)
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

export default function ServicesPage() {
  const { staffProfile } = useAuth()
  const isAdmin = staffProfile?.role === "administrador"
  const [searchParams, setSearchParams] = useSearchParams()
  const [requests, setRequests] = useState<ServiceRequest[] | null>(null)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [clientStatusFilter, setClientStatusFilter] = useState<
    "all" | "nuevo" | "recurrente"
  >("all")
  const [serviceStatusFilter, setServiceStatusFilter] = useState<
    "all" | "iniciado" | "en_proceso" | "completo"
  >("all")
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("custom")
  const [selected, setSelected] = useState<ServiceRequest | null>(null)
  const [editing, setEditing] = useState(false)
  const [editValues, setEditValues] = useState<EditableFields | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [signLinkCopied, setSignLinkCopied] = useState(false)
  const [notes, setNotes] = useState<Note[] | null>(null)
  const [notesError, setNotesError] = useState("")
  const [newNoteBody, setNewNoteBody] = useState("")
  const [newNoteScope, setNewNoteScope] = useState<"client" | "service">(
    "client"
  )
  const [addingNote, setAddingNote] = useState(false)

  async function loadNotes(request: ServiceRequest) {
    setNotes(null)
    setNotesError("")

    const { data, error } = await supabase
      .from("notes")
      .select("id, created_at, client_id, service_request_id, author, body")
      .or(`client_id.eq.${request.client_id},service_request_id.eq.${request.id}`)
      .order("created_at", { ascending: false })

    if (error) {
      setNotesError("No pudimos cargar la bitácora.")
      return
    }

    setNotes(data)
  }

  async function handleAddNote() {
    if (!selected || !newNoteBody.trim()) return

    setAddingNote(true)
    setNotesError("")

    const { data, error } = await supabase
      .from("notes")
      .insert({
        client_id: newNoteScope === "client" ? selected.client_id : null,
        service_request_id:
          newNoteScope === "service" ? selected.id : null,
        body: newNoteBody.trim(),
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

  function handleExport() {
    if (!filteredRequests || filteredRequests.length === 0) return

    const rows = filteredRequests.map((request) => {
      const client = request.clients
      const isRecurring =
        (clientServiceCounts.get(request.client_id) ?? 1) > 1
      const sector =
        request.sector === "Otro" ? request.sector_other ?? "" : request.sector
      const referral =
        request.referral === "Otro"
          ? request.referral_other ?? ""
          : request.referral

      return {
        Negocio: client.business_name,
        Representante: client.representative_name,
        Cédula: client.id_number,
        RNC: client.rnc_number ?? "",
        Teléfono: client.phone,
        Correo: client.email,
        Provincia: client.province,
        Municipio: client.municipality,
        Dirección: client.address ?? "",
        Sector: sector,
        Descripción: request.business_description,
        "Servicios solicitados": request.services.join("; "),
        "Estado del cliente": isRecurring ? "Recurrente" : "Nuevo",
        "Estado del servicio": serviceStatusLabel(request.status),
        "Cómo se enteró": referral,
        Firmado: request.signature ? "Sí" : "No",
        "Fecha de solicitud": request.created_at.slice(0, 10),
      }
    })

    const from = dateFrom || "todas"
    const to = dateTo || "todas"
    downloadXlsx(rows, `servicios_${from}_a_${to}.xlsx`)
  }

  async function handleCopySignLink() {
    if (!selected) return
    const signUrl = `${window.location.origin}/firmar/${selected.id}`
    await navigator.clipboard.writeText(signUrl)
    setSignLinkCopied(true)
    setTimeout(() => setSignLinkCopied(false), 2000)
  }

  useEffect(() => {
    let cancelled = false

    async function loadRequests() {
      const { data, error } = await supabase
        .from("service_requests")
        .select(
          "id, created_at, client_id, sector, sector_other, business_description, start_date, employee_count, services, referral, referral_other, signature, status, clients(id, business_name, has_rnc, rnc_number, province, municipality, representative_name, sex, age, phone, is_owner, id_number, email, address)"
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false })

      if (cancelled) return

      if (error) {
        setError("No pudimos cargar los servicios. Intenta de nuevo más tarde.")
        return
      }

      setRequests(data as unknown as ServiceRequest[])
    }

    loadRequests()
    return () => {
      cancelled = true
    }
  }, [])

  function openRequest(request: ServiceRequest) {
    setSelected(request)
    setEditing(false)
    setSaveError("")
    setConfirmingDelete(false)
    setDeleteError("")
    setNewNoteBody("")
    setNewNoteScope("client")
    loadNotes(request)
  }

  // Deep link desde Clientes: /servicios?id=<serviceRequestId> abre ese
  // servicio directamente en cuanto termina de cargar la lista.
  useEffect(() => {
    if (!requests) return
    const id = searchParams.get("id")
    if (!id) return

    const match = requests.find((request) => request.id === id)
    if (match) openRequest(match)
    setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests])

  // Estado del cliente (Nuevo/Recurrente): se calcula contando cuántos
  // servicios activos tiene cada client_id, no se guarda en la base.
  const clientServiceCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const request of requests ?? []) {
      counts.set(request.client_id, (counts.get(request.client_id) ?? 0) + 1)
    }
    return counts
  }, [requests])

  const filteredRequests = useMemo(() => {
    if (!requests) return requests

    const normalizedQuery = query.trim().toLocaleLowerCase("es")

    return requests.filter((request) => {
      if (normalizedQuery) {
        const matchesQuery = [
          request.clients.business_name,
          request.clients.representative_name,
          request.clients.email,
          request.clients.phone,
          request.clients.province,
          request.clients.municipality,
          request.sector,
        ]
          .join(" ")
          .toLocaleLowerCase("es")
          .includes(normalizedQuery)
        if (!matchesQuery) return false
      }

      if (dateFrom && request.created_at.slice(0, 10) < dateFrom) return false
      if (dateTo && request.created_at.slice(0, 10) > dateTo) return false

      if (clientStatusFilter !== "all") {
        const isRecurring = (clientServiceCounts.get(request.client_id) ?? 1) > 1
        if (clientStatusFilter === "recurrente" && !isRecurring) return false
        if (clientStatusFilter === "nuevo" && isRecurring) return false
      }

      if (serviceStatusFilter !== "all" && request.status !== serviceStatusFilter) {
        return false
      }

      return true
    })
  }, [
    requests,
    query,
    dateFrom,
    dateTo,
    clientStatusFilter,
    serviceStatusFilter,
    clientServiceCounts,
  ])

  function closeSheet() {
    setSelected(null)
    setEditing(false)
    setEditValues(null)
    setSaveError("")
    setConfirmingDelete(false)
    setDeleteError("")
    setNotes(null)
    setNotesError("")
    setNewNoteBody("")
  }

  async function handleDelete() {
    if (!selected) return

    setDeleting(true)
    setDeleteError("")

    const { error } = await supabase
      .from("service_requests")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", selected.id)

    if (!error) {
      await supabase.from("service_request_changes").insert({
        service_request_id: selected.id,
        business_name: selected.clients.business_name,
        action: "eliminado",
      })
    }

    setDeleting(false)

    if (error) {
      setDeleteError("No pudimos eliminar el servicio. Intenta de nuevo.")
      return
    }

    const deletedId = selected.id
    setRequests(
      (current) => current?.filter((request) => request.id !== deletedId) ?? current
    )
    closeSheet()
  }

  function startEditing() {
    if (!selected) return
    setEditValues(toEditableFields(selected))
    setEditing(true)
    setSaveError("")
  }

  function updateEditValue<Key extends keyof EditableFields>(
    key: Key,
    value: EditableFields[Key]
  ) {
    setEditValues((current) => (current ? { ...current, [key]: value } : current))
  }

  async function handleSave() {
    if (!selected || !editValues) return

    const changedFields: Record<string, { from: unknown; to: unknown }> = {}
    for (const key of [
      ...CLIENT_FIELD_KEYS,
      ...SERVICE_FIELD_KEYS,
    ] as (keyof EditableFields)[]) {
      const before = JSON.stringify(flatValue(selected, key))
      const after = JSON.stringify(editValues[key])
      if (before === after) continue

      if (key === "signature") {
        changedFields[key] = {
          from: selected.signature ? "(firma anterior)" : "(sin firma)",
          to: editValues.signature ? "(firma nueva)" : "(sin firma)",
        }
      } else {
        changedFields[key] = { from: flatValue(selected, key), to: editValues[key] }
      }
    }

    if (Object.keys(changedFields).length === 0) {
      setEditing(false)
      return
    }

    setSaving(true)
    setSaveError("")

    const clientUpdate = Object.fromEntries(
      CLIENT_FIELD_KEYS.map((key) => [key, editValues[key]])
    )
    const serviceUpdate = Object.fromEntries(
      SERVICE_FIELD_KEYS.map((key) => [key, editValues[key]])
    )

    const [clientResult, serviceResult] = await Promise.all([
      supabase.from("clients").update(clientUpdate).eq("id", selected.client_id),
      supabase
        .from("service_requests")
        .update(serviceUpdate)
        .eq("id", selected.id),
    ])
    const error = clientResult.error ?? serviceResult.error

    if (!error) {
      await supabase.from("service_request_changes").insert({
        service_request_id: selected.id,
        business_name: editValues.business_name,
        action: "editado",
        changed_fields: changedFields,
      })
    }

    setSaving(false)

    if (error) {
      setSaveError("No pudimos guardar los cambios. Intenta de nuevo.")
      return
    }

    const updated = applyEditableFields(selected, editValues)
    setRequests(
      (current) =>
        current?.map((request) =>
          request.id === updated.id ? updated : request
        ) ?? current
    )
    setSelected(updated)
    setEditing(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Servicios</h1>
      </div>

      {requests !== null && requests.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por negocio, representante, correo..."
              className="pl-8"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {periodPresetOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={periodPreset === option.value ? "default" : "outline"}
                onClick={() => {
                  setPeriodPreset(option.value)
                  if (option.value !== "custom") {
                    const range = getPeriodRange(option.value)
                    setDateFrom(range.from)
                    setDateTo(range.to)
                  }
                }}
              >
                {option.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="filter-date-from" className="text-xs">
                Desde
              </Label>
              <Input
                id="filter-date-from"
                type="date"
                value={dateFrom}
                onChange={(event) => {
                  setDateFrom(event.target.value)
                  setPeriodPreset("custom")
                }}
                className="w-40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="filter-date-to" className="text-xs">
                Hasta
              </Label>
              <Input
                id="filter-date-to"
                type="date"
                value={dateTo}
                onChange={(event) => {
                  setDateTo(event.target.value)
                  setPeriodPreset("custom")
                }}
                className="w-40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="filter-client-status" className="text-xs">
                Estado del cliente
              </Label>
              <Select
                id="filter-client-status"
                value={clientStatusFilter}
                onChange={(event) =>
                  setClientStatusFilter(
                    event.target.value as typeof clientStatusFilter
                  )
                }
                className="w-40"
              >
                <option value="all">Todos</option>
                <option value="nuevo">Nuevo</option>
                <option value="recurrente">Recurrente</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="filter-service-status" className="text-xs">
                Estado del servicio
              </Label>
              <Select
                id="filter-service-status"
                value={serviceStatusFilter}
                onChange={(event) =>
                  setServiceStatusFilter(
                    event.target.value as typeof serviceStatusFilter
                  )
                }
                className="w-40"
              >
                <option value="all">Todos</option>
                {serviceStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            {(dateFrom ||
              dateTo ||
              clientStatusFilter !== "all" ||
              serviceStatusFilter !== "all") && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateFrom("")
                  setDateTo("")
                  setPeriodPreset("custom")
                  setClientStatusFilter("all")
                  setServiceStatusFilter("all")
                }}
              >
                Limpiar filtros
              </Button>
            )}
            {isAdmin && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-auto gap-1.5"
                disabled={!filteredRequests || filteredRequests.length === 0}
                onClick={handleExport}
              >
                <Download className="size-4" />
                Exportar ({filteredRequests?.length ?? 0})
              </Button>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!error && requests === null && (
        <p className="text-sm text-muted-foreground">Cargando servicios...</p>
      )}

      {requests !== null && requests.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Users className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Todavía no hay solicitudes de servicios.
          </p>
        </div>
      )}

      {requests !== null &&
        requests.length > 0 &&
        filteredRequests?.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <Search className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No encontramos servicios que coincidan con "{query}".
            </p>
          </div>
        )}

      {filteredRequests !== null && filteredRequests.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRequests.map((request) => (
            <Card
              key={request.id}
              role="button"
              tabIndex={0}
              onClick={() => openRequest(request)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  openRequest(request)
                }
              }}
              className="cursor-pointer transition-colors hover:border-primary/50"
            >
              <CardHeader>
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="size-4" />
                </div>
                <CardTitle className="mt-2 text-base">
                  {request.clients.business_name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {request.clients.representative_name}
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 pb-6 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-3.5 shrink-0" />
                  <span className="truncate">{request.clients.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-3.5 shrink-0" />
                  <span className="truncate">{request.clients.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" />
                  <span className="truncate">
                    {request.clients.municipality}, {request.clients.province}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="size-3.5 shrink-0" />
                  <span>{formatDate(request.created_at)}</span>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {!request.signature && (
                    <Badge variant="destructive">
                      <PenOff className="size-3" />
                      Sin firmar
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {(clientServiceCounts.get(request.client_id) ?? 1) > 1
                      ? "Recurrente"
                      : "Nuevo"}
                  </Badge>
                  <Badge variant={serviceStatusBadgeVariant(request.status)}>
                    {serviceStatusLabel(request.status)}
                  </Badge>
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

      <Sheet
        open={selected !== null}
        onClose={closeSheet}
        title={selected?.clients.business_name}
        description={
          selected ? `Recibida el ${formatDate(selected.created_at)}` : ""
        }
        footer={
          editing ? (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          ) : confirmingDelete ? (
            <div className="flex flex-col gap-2">
              {deleteError && (
                <p className="text-sm text-destructive">{deleteError}</p>
              )}
              <p className="text-sm text-muted-foreground">
                ¿Eliminar este servicio? Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Eliminando..." : "Sí, eliminar"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap justify-end gap-2">
              {selected && !selected.signature && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopySignLink}
                >
                  {signLinkCopied ? (
                    <>
                      <Check className="size-4" />
                      Enlace copiado
                    </>
                  ) : (
                    <>
                      <LinkIcon className="size-4" />
                      Enviar a firmar
                    </>
                  )}
                </Button>
              )}
              <Button
                type="button"
                variant="destructive"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 className="size-4" />
                Eliminar
              </Button>
              <Button type="button" onClick={startEditing}>
                <Pencil className="size-4" />
                Editar
              </Button>
            </div>
          )
        }
      >
        {selected && !editing && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline">
                {(clientServiceCounts.get(selected.client_id) ?? 1) > 1
                  ? "Cliente recurrente"
                  : "Cliente nuevo"}
              </Badge>
              <Badge variant={serviceStatusBadgeVariant(selected.status)}>
                {serviceStatusLabel(selected.status)}
              </Badge>
            </div>
            <DetailRow
              label="Nombre del Negocio o Emprendimiento"
              value={selected.clients.business_name}
            />
            <DetailRow
              label="¿Posee RNC?"
              value={selected.clients.has_rnc === "si" ? "Sí" : "No"}
            />
            {selected.clients.has_rnc === "si" && (
              <DetailRow
                label="Número de RNC"
                value={selected.clients.rnc_number}
              />
            )}
            <div className="grid grid-cols-2 gap-4">
              <DetailRow label="Provincia" value={selected.clients.province} />
              <DetailRow
                label="Municipio"
                value={selected.clients.municipality}
              />
            </div>
            <DetailRow
              label="Representante"
              value={selected.clients.representative_name}
            />
            <div className="grid grid-cols-2 gap-4">
              <DetailRow
                label="Sexo"
                value={
                  selected.clients.sex === "femenino" ? "Femenino" : "Masculino"
                }
              />
              <DetailRow label="Edad" value={selected.clients.age} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <DetailRow label="Teléfono" value={selected.clients.phone} />
              <DetailRow
                label="¿Es dueño de la empresa?"
                value={selected.clients.is_owner === "si" ? "Sí" : "No"}
              />
            </div>
            <DetailRow
              label="Número de Cédula de Identidad y Electoral"
              value={selected.clients.id_number}
            />
            <DetailRow
              label="Correo Electrónico"
              value={selected.clients.email}
            />
            <DetailRow
              label="Sector económico"
              value={
                selected.sector === "Otro"
                  ? selected.sector_other
                  : selected.sector
              }
            />
            <DetailRow
              label="Descripción del Negocio"
              value={selected.business_description}
            />
            <div className="grid grid-cols-2 gap-4">
              <DetailRow
                label="Fecha de inicio de operaciones"
                value={selected.start_date}
              />
              <DetailRow
                label="Número de empleados"
                value={selected.employee_count}
              />
            </div>
            <DetailRow label="Dirección" value={selected.clients.address} />
            <DetailRow
              label="Servicios solicitados"
              value={
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {selected.services.map((service) => (
                    <Badge key={service} variant="outline">
                      {service}
                    </Badge>
                  ))}
                </div>
              }
            />
            <DetailRow
              label="¿Cómo se enteró de los servicios?"
              value={
                selected.referral === "Otro"
                  ? selected.referral_other
                  : selected.referral
              }
            />

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Firma
              </span>
              {selected.signature ? (
                <div className="flex h-40 w-full items-center justify-center rounded-lg border bg-white p-2">
                  <img
                    src={selected.signature}
                    alt="Firma del cliente"
                    className="h-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-40 w-full items-center justify-center rounded-lg border border-dashed bg-muted/30 text-xs text-muted-foreground">
                  Sin firma
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t pt-4">
              <div className="flex items-center gap-2">
                <StickyNote className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Bitácora</span>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNewNoteScope("client")}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                      newNoteScope === "client"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    Sobre el cliente
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewNoteScope("service")}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                      newNoteScope === "service"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    Sobre este servicio
                  </button>
                </div>
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
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
                          <Badge variant="outline">
                            {note.client_id ? "Cliente" : "Este servicio"}
                          </Badge>
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

        {editValues && editing && (
          <div className="flex flex-col gap-4">
            {saveError && (
              <p className="text-sm text-destructive">{saveError}</p>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-status">Estado del servicio</Label>
              <Select
                id="edit-status"
                value={editValues.status}
                onChange={(event) =>
                  updateEditValue("status", event.target.value)
                }
              >
                {serviceStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-business-name">
                Nombre del Negocio o Emprendimiento
              </Label>
              <Input
                id="edit-business-name"
                value={editValues.business_name}
                onChange={(event) =>
                  updateEditValue("business_name", event.target.value)
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-has-rnc">¿Posee RNC?</Label>
              <Select
                id="edit-has-rnc"
                value={editValues.has_rnc}
                onChange={(event) =>
                  updateEditValue("has_rnc", event.target.value)
                }
              >
                <option value="si">Sí</option>
                <option value="no">No</option>
              </Select>
            </div>

            {editValues.has_rnc === "si" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-rnc-number">Número de RNC</Label>
                <Input
                  id="edit-rnc-number"
                  value={editValues.rnc_number ?? ""}
                  onChange={(event) =>
                    updateEditValue("rnc_number", event.target.value)
                  }
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-province">Provincia</Label>
              <Combobox
                id="edit-province"
                value={editValues.province}
                onValueChange={(next) => {
                  updateEditValue("province", next)
                  updateEditValue("municipality", "")
                }}
                options={dominicanProvinces}
                placeholder="Selecciona una provincia"
                searchPlaceholder="Buscar provincia..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-municipality">Municipio</Label>
              <Combobox
                id="edit-municipality"
                value={editValues.municipality}
                onValueChange={(next) => updateEditValue("municipality", next)}
                options={municipalitiesByProvince[editValues.province] ?? []}
                placeholder="Selecciona un municipio"
                searchPlaceholder="Buscar municipio..."
                disabled={!editValues.province}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-representative">Representante</Label>
              <Input
                id="edit-representative"
                value={editValues.representative_name}
                onChange={(event) =>
                  updateEditValue("representative_name", event.target.value)
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-sex">Sexo</Label>
                <Select
                  id="edit-sex"
                  value={editValues.sex}
                  onChange={(event) =>
                    updateEditValue("sex", event.target.value)
                  }
                >
                  <option value="femenino">Femenino</option>
                  <option value="masculino">Masculino</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-age">Edad</Label>
                <Input
                  id="edit-age"
                  type="number"
                  min={0}
                  value={editValues.age}
                  onChange={(event) =>
                    updateEditValue("age", Number(event.target.value))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-phone">Teléfono</Label>
                <Input
                  id="edit-phone"
                  value={editValues.phone}
                  onChange={(event) =>
                    updateEditValue(
                      "phone",
                      formatPhoneNumber(event.target.value)
                    )
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-is-owner">¿Es dueño?</Label>
                <Select
                  id="edit-is-owner"
                  value={editValues.is_owner}
                  onChange={(event) =>
                    updateEditValue("is_owner", event.target.value)
                  }
                >
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-id-number">
                Número de Cédula de Identidad y Electoral
              </Label>
              <Input
                id="edit-id-number"
                value={editValues.id_number}
                onChange={(event) =>
                  updateEditValue(
                    "id_number",
                    formatCedula(event.target.value)
                  )
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-email">Correo Electrónico</Label>
              <Input
                id="edit-email"
                type="email"
                value={editValues.email}
                onChange={(event) =>
                  updateEditValue("email", event.target.value)
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-sector">Sector económico</Label>
              <Select
                id="edit-sector"
                value={editValues.sector}
                onChange={(event) =>
                  updateEditValue("sector", event.target.value)
                }
              >
                {sectorOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "Otro" ? "Otro (especificar)" : option}
                  </option>
                ))}
              </Select>
              {editValues.sector === "Otro" && (
                <Input
                  value={editValues.sector_other ?? ""}
                  onChange={(event) =>
                    updateEditValue("sector_other", event.target.value)
                  }
                  placeholder="Especifica el sector económico"
                />
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-description">
                Descripción del Negocio
              </Label>
              <Textarea
                id="edit-description"
                value={editValues.business_description}
                onChange={(event) =>
                  updateEditValue("business_description", event.target.value)
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-start-date">Fecha de inicio</Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={editValues.start_date}
                  onChange={(event) =>
                    updateEditValue("start_date", event.target.value)
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-employee-count">N.º de empleados</Label>
                <Input
                  id="edit-employee-count"
                  type="number"
                  min={0}
                  value={editValues.employee_count}
                  onChange={(event) =>
                    updateEditValue(
                      "employee_count",
                      Number(event.target.value)
                    )
                  }
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-address">Dirección</Label>
              <Input
                id="edit-address"
                value={editValues.address ?? ""}
                onChange={(event) =>
                  updateEditValue("address", event.target.value)
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Servicios solicitados</Label>
              <MultiCombobox
                values={editValues.services}
                onValuesChange={(next) => updateEditValue("services", next)}
                options={serviceOptions}
                placeholder="Selecciona uno o más servicios"
                searchPlaceholder="Buscar servicio..."
                columns={1}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-referral">
                ¿Cómo se enteró de los servicios?
              </Label>
              <Select
                id="edit-referral"
                value={editValues.referral}
                onChange={(event) =>
                  updateEditValue("referral", event.target.value)
                }
              >
                {referralOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "Otro" ? "Otro (especificar)" : option}
                  </option>
                ))}
              </Select>
              {editValues.referral === "Otro" && (
                <Input
                  value={editValues.referral_other ?? ""}
                  onChange={(event) =>
                    updateEditValue("referral_other", event.target.value)
                  }
                  placeholder="Especifica cómo se enteró"
                />
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Firma</Label>
              {editValues.signature ? (
                <div className="flex h-40 w-full items-center justify-center rounded-lg border bg-white p-2">
                  <img
                    src={editValues.signature}
                    alt="Firma del cliente"
                    className="h-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-40 w-full items-center justify-center rounded-lg border border-dashed bg-muted/30 text-xs text-muted-foreground">
                  Sin firma
                </div>
              )}
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
