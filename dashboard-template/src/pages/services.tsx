import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import {
  Building2,
  Calendar,
  Check,
  Download,
  FileDown,
  FileText,
  ImagePlus,
  Link as LinkIcon,
  Mail,
  MapPin,
  Clock,
  Pencil,
  PenOff,
  Phone,
  RefreshCw,
  Search,
  StickyNote,
  Trash2,
  Users,
  X,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
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
import { regionByProvince, monthNameFromDate, trimesterFromDate } from "@/data/dominican-regions"
import { CREATOR_EMAIL, useAuth } from "@/hooks/use-auth"
import { formatCedula, formatPhoneNumber } from "@/lib/format"
import {
  buildAgreementPdf,
  type CompletionAgreementPdfData,
} from "@/pages/completion-agreement"
import {
  buildActionAgreementPdf,
  type ActionAgreementPdfData,
} from "@/pages/action-agreement"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

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
  id_photo_paths: string[] | null
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
  confidentiality: string | null
  signature: string | null
  status: string
  assigned_advisor_id: string | null
  assigned_coordinator_id: string | null
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
  "assigned_advisor_id",
  "assigned_coordinator_id",
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
    assigned_advisor_id: request.assigned_advisor_id,
    assigned_coordinator_id: request.assigned_coordinator_id,
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
    assigned_advisor_id: fields.assigned_advisor_id,
    assigned_coordinator_id: fields.assigned_coordinator_id,
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

function downloadXlsx(
  rows: Record<string, unknown>[],
  filename: string,
  sheetName = "Servicios"
) {
  const sheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName)
  XLSX.writeFile(workbook, filename)
}

function loadImageDataUrl(url: string): Promise<string> {
  return fetch(url)
    .then((res) => res.blob())
    .then(
      (blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () =>
            reject(new Error("No se pudo cargar la imagen"))
          reader.readAsDataURL(blob)
        })
    )
}

function dataUrlImageFormat(dataUrl: string) {
  const match = dataUrl.match(/^data:image\/(\w+);/)
  return (match?.[1] ?? "jpeg").toUpperCase()
}

// Textos calcados de la Sección 2 — Acuerdo y Confidencialidad del
// formulario de Solicitud de Servicios (service-request.tsx).
const DECLARATION_TEXT =
  "Yo declaro bajo juramento que la información proporcionada es verídica. Yo estoy de acuerdo en participar si soy seleccionado para contestar la encuesta de evaluación de los servicios de asesoría recibidos del Centro de Prototipado y Transferencia Tecnológica. Autorizo al MICM y al Centro de Prototipado y Transferencia Tecnológica el uso de mi nombre y domicilio para las encuestas de MICM. Yo autorizo al Centro de Prototipado y Transferencia Tecnológica para proporcionar la información relevante al asesor(a) asignado. Yo entiendo que el asesor(a) ha acordado: 1) no recomendar servicios o bienes en el cual tenga interés personal. 2) no aceptar comisiones o pagos por el asesoramiento. Yo acepto dar un aporte empresarial en aquellos servicios que me ofrezca el Centro de Prototipado y Transferencia Tecnológica y que tengan un costo para mí como empresario."

const CONFIDENTIALITY_TEXT =
  "El Centro de Prototipado y Transferencia Tecnológica mantendrá estricta confidencialidad e imparcialidad durante la ejecución de los trabajos aquí descritos, así como al término de los mismos. De la misma manera, las informaciones a las que el Centro de Prototipado y Transferencia Tecnológica tendrá acceso directa o indirectamente quedarán sujetas a esta cláusula. El Centro de Prototipado y Transferencia Tecnológica exigirá compromisos de confidencialidad e imparcialidad similares a terceros, auditores y a los que el centro tenga que involucrar para el cumplimiento de los objetivos de esta propuesta. En caso de requerimiento de tipo judicial, ordenado por un juez competente, el Centro de Prototipado y Transferencia Tecnológica quedará liberado de dicha confidencialidad y se contactará al cliente para informarle."

// Genera un PDF con todos los datos del formulario de esta solicitud
// (no solo lo que cabe en pantalla) — incluye las fotos de cédula y la
// firma como imágenes reales, no solo enlaces. Todo en dos columnas
// para que quepa en una sola página en el caso normal; si el contenido
// es inusualmente largo, sigue paginando en vez de recortarlo.
async function buildServicePdf(
  request: ServiceRequest,
  advisorName: string,
  coordinatorName: string,
  cedulaPhotoUrls: string[]
) {
  const doc = new jsPDF({ unit: "mm", format: "letter" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14
  const contentWidth = pageWidth - margin * 2
  const bottomLimit = pageHeight - margin
  const colGap = 8
  const colWidth = (contentWidth - colGap) / 2
  const leftX = margin
  const rightX = margin + colWidth + colGap

  type Cursor = { x: number; y: number }

  function ensureSpace(cursor: Cursor, height: number) {
    if (cursor.y + height > bottomLimit) {
      doc.addPage()
      cursor.y = margin
    }
  }

  function addField(
    cursor: Cursor,
    label: string,
    value: string | number | null | undefined
  ) {
    const text =
      value === null || value === undefined || value === ""
        ? "—"
        : String(value)
    ensureSpace(cursor, 4)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(7.5)
    doc.text(label, cursor.x, cursor.y)
    cursor.y += 3.6
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    const lines = doc.splitTextToSize(text, colWidth)
    ensureSpace(cursor, lines.length * 4)
    doc.text(lines, cursor.x, cursor.y)
    cursor.y += lines.length * 4 + 2.5
  }

  function addSectionTitle(cursor: Cursor, title: string, width = colWidth) {
    ensureSpace(cursor, 10)
    doc.setDrawColor(200)
    doc.line(cursor.x, cursor.y, cursor.x + width, cursor.y)
    cursor.y += 5
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.text(title, cursor.x, cursor.y)
    cursor.y += 5.5
  }

  const logo = await loadImageDataUrl("/cptt-logo.png")
  const logoWidth = 45
  const logoHeight = logoWidth / (439 / 109)
  doc.addImage(logo, "PNG", margin, margin, logoWidth, logoHeight)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.text("Solicitud de Servicios", margin + logoWidth + 6, margin + 6)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text(
    `Generado el ${new Date().toLocaleDateString("es-DO")}`,
    margin + logoWidth + 6,
    margin + 11
  )
  doc.setTextColor(0)

  const startY = margin + logoHeight + 6
  const left: Cursor = { x: leftX, y: startY }
  const right: Cursor = { x: rightX, y: startY }

  const client = request.clients

  addSectionTitle(left, "Datos del Negocio y del Representante")
  addField(left, "Asesor encargado", advisorName)
  addField(left, "Coordinador(a) encargado", coordinatorName)
  addField(left, "Estado del servicio", serviceStatusLabel(request.status))
  addField(left, "Nombre del Negocio o Emprendimiento", client.business_name)
  addField(left, "¿Posee RNC?", client.has_rnc === "si" ? "Sí" : "No")
  if (client.has_rnc === "si")
    addField(left, "Número de RNC", client.rnc_number)
  addField(left, "Provincia", client.province)
  addField(left, "Municipio", client.municipality)
  addField(left, "Representante", client.representative_name)
  addField(
    left,
    "Sexo",
    client.sex === "femenino" ? "Femenino" : "Masculino"
  )
  addField(left, "Edad", client.age)
  addField(left, "Teléfono", client.phone)
  addField(
    left,
    "¿Es dueño de la empresa?",
    client.is_owner === "si" ? "Sí" : "No"
  )
  addField(left, "Número de Cédula de Identidad y Electoral", client.id_number)
  addField(left, "Correo Electrónico", client.email)
  addField(left, "Dirección", client.address)

  addSectionTitle(right, "Datos del Servicio")
  addField(
    right,
    "Sector económico",
    request.sector === "Otro" ? request.sector_other : request.sector
  )
  addField(right, "Descripción del Negocio", request.business_description)
  addField(right, "Fecha de inicio de operaciones", request.start_date)
  addField(right, "Número de empleados", request.employee_count)
  addField(right, "Servicios solicitados", request.services.join(", "))
  addField(
    right,
    "¿Cómo se enteró de los servicios?",
    request.referral === "Otro" ? request.referral_other : request.referral
  )
  addField(right, "Fecha de solicitud", formatDate(request.created_at))
  addField(
    right,
    "Confidencialidad",
    request.confidentiality === "si"
      ? "Sí"
      : request.confidentiality === "no"
        ? "No"
        : null
  )

  addSectionTitle(right, "Firma")
  if (request.signature) {
    ensureSpace(right, 22)
    doc.addImage(
      request.signature,
      dataUrlImageFormat(request.signature),
      right.x,
      right.y,
      50,
      20
    )
    right.y += 22
  } else {
    ensureSpace(right, 5)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text("Sin firma", right.x, right.y)
    right.y += 5
  }

  if (cedulaPhotoUrls.length > 0) {
    addSectionTitle(right, "Fotografías de la cédula")
    const photoWidth = (colWidth - 4) / 2
    const photoHeight = photoWidth * 0.65
    let x = right.x

    for (const url of cedulaPhotoUrls) {
      try {
        const dataUrl = await loadImageDataUrl(url)
        ensureSpace(right, photoHeight + 3)
        doc.addImage(
          dataUrl,
          dataUrlImageFormat(dataUrl),
          x,
          right.y,
          photoWidth,
          photoHeight
        )
        x += photoWidth + 4
        if (x + photoWidth > right.x + colWidth) {
          x = right.x
          right.y += photoHeight + 3
        }
      } catch {
        // Si una foto no carga, seguimos con las demás.
      }
    }
    right.y += photoHeight + 4
  }

  const fullWidthCursor: Cursor = { x: margin, y: Math.max(left.y, right.y) }

  function addFullWidthField(cursor: Cursor, label: string, text: string) {
    ensureSpace(cursor, 4)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(7.5)
    doc.text(label, cursor.x, cursor.y)
    cursor.y += 3.4
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    const lines = doc.splitTextToSize(text, contentWidth)
    ensureSpace(cursor, lines.length * 3.2)
    doc.text(lines, cursor.x, cursor.y)
    cursor.y += lines.length * 3.2 + 3
  }

  addSectionTitle(
    fullWidthCursor,
    "Acuerdo y Confidencialidad",
    contentWidth
  )
  addFullWidthField(fullWidthCursor, "Declaración", DECLARATION_TEXT)
  addFullWidthField(
    fullWidthCursor,
    "Cláusula de confidencialidad",
    CONFIDENTIALITY_TEXT
  )

  const footerLogos = await loadImageDataUrl("/logos-institucionales.png")
  const footerWidthFit = Math.min(55, contentWidth)
  const footerHeightFit = footerWidthFit / (957 / 281)
  const spaceLeft = bottomLimit - fullWidthCursor.y
  const footerWidth =
    spaceLeft >= footerHeightFit + 2
      ? footerWidthFit
      : Math.max(30, spaceLeft * (957 / 281))
  const footerHeight = footerWidth / (957 / 281)
  doc.addImage(
    footerLogos,
    "PNG",
    margin + (contentWidth - footerWidth) / 2,
    fullWidthCursor.y + 2,
    footerWidth,
    footerHeight
  )

  return doc
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
  const [refreshing, setRefreshing] = useState(false)
  const [pendingAgreementIds, setPendingAgreementIds] = useState<Set<string>>(
    new Set()
  )
  const [staffOptions, setStaffOptions] = useState<
    { id: string; name: string; email: string; role: string }[]
  >([])
  const [exportChoiceOpen, setExportChoiceOpen] = useState(false)
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
  const [advisorFilter, setAdvisorFilter] = useState("all")
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
  const [surveyLinkCopied, setSurveyLinkCopied] = useState(false)
  const [idPhotoUrls, setIdPhotoUrls] = useState<
    { url: string; isPdf: boolean }[] | null
  >(null)
  const [notes, setNotes] = useState<Note[] | null>(null)
  const [notesError, setNotesError] = useState("")
  const [newNoteBody, setNewNoteBody] = useState("")
  const [newNoteScope, setNewNoteScope] = useState<"client" | "service">(
    "client"
  )
  const [addingNote, setAddingNote] = useState(false)
  const [evidenceCounts, setEvidenceCounts] = useState<Map<string, number>>(
    new Map()
  )
  const [evidenceService, setEvidenceService] = useState<string | null>(null)
  const [evidencePhotos, setEvidencePhotos] = useState<
    { id: string; path: string; url: string }[] | null
  >(null)
  const [evidenceUploading, setEvidenceUploading] = useState(false)
  const [evidenceError, setEvidenceError] = useState("")
  const [exportingServicePdf, setExportingServicePdf] = useState(false)
  const [exportServicePdfError, setExportServicePdfError] = useState("")
  const [servicePdfChoiceOpen, setServicePdfChoiceOpen] = useState(false)
  const [availableAgreements, setAvailableAgreements] = useState<{
    actionAgreementId: string | null
    completionAgreementId: string | null
  }>({ actionAgreementId: null, completionAgreementId: null })
  const [pendingAgreements, setPendingAgreements] = useState<{
    actionAgreementId: string | null
    completionAgreementId: string | null
  }>({ actionAgreementId: null, completionAgreementId: null })
  const [actionSignLinkCopied, setActionSignLinkCopied] = useState(false)
  const [completionSignLinkCopied, setCompletionSignLinkCopied] = useState(false)

  async function loadAvailableAgreements(requestId: string) {
    // El acuerdo más reciente de cada tipo puede estar firmado (se puede
    // exportar como PDF) o con la firma del cliente pendiente por enlace
    // (se muestra como pendiente, con opción de volver a copiar el enlace).
    const [actionResult, completionResult] = await Promise.all([
      supabase
        .from("project_action_agreements")
        .select("id, client_signature")
        .eq("service_request_id", requestId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("completion_agreements")
        .select("id, client_signature")
        .eq("service_request_id", requestId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    setAvailableAgreements({
      actionAgreementId: actionResult.data?.client_signature
        ? actionResult.data.id
        : null,
      completionAgreementId: completionResult.data?.client_signature
        ? completionResult.data.id
        : null,
    })
    setPendingAgreements({
      actionAgreementId:
        actionResult.data && !actionResult.data.client_signature
          ? actionResult.data.id
          : null,
      completionAgreementId:
        completionResult.data && !completionResult.data.client_signature
          ? completionResult.data.id
          : null,
    })
  }

  async function handleCopyActionAgreementSignLink() {
    if (!pendingAgreements.actionAgreementId) return
    const url = `${window.location.origin}/firmar-acuerdo-acciones/${pendingAgreements.actionAgreementId}`
    await navigator.clipboard.writeText(url)
    setActionSignLinkCopied(true)
    setTimeout(() => setActionSignLinkCopied(false), 2000)
  }

  async function handleCopyCompletionAgreementSignLink() {
    if (!pendingAgreements.completionAgreementId) return
    const url = `${window.location.origin}/firmar-acuerdo-finalizacion/${pendingAgreements.completionAgreementId}`
    await navigator.clipboard.writeText(url)
    setCompletionSignLinkCopied(true)
    setTimeout(() => setCompletionSignLinkCopied(false), 2000)
  }

  async function handleExportServicePdf() {
    if (!selected) return

    setServicePdfChoiceOpen(false)
    setExportingServicePdf(true)
    setExportServicePdfError("")

    try {
      const advisorName =
        staffOptions.find((option) => option.id === selected.assigned_advisor_id)
          ?.name ?? "Sin asignar"
      const coordinatorName =
        staffOptions.find(
          (option) => option.id === selected.assigned_coordinator_id
        )?.name ?? "Sin asignar"
      const doc = await buildServicePdf(
        selected,
        advisorName,
        coordinatorName,
        (idPhotoUrls ?? []).filter((photo) => !photo.isPdf).map((photo) => photo.url)
      )
      doc.save(`solicitud-servicio-${selected.clients.business_name}.pdf`)
    } catch {
      setExportServicePdfError("No pudimos generar el PDF. Intenta de nuevo.")
    }

    setExportingServicePdf(false)
  }

  async function handleExportActionAgreementPdf() {
    if (!selected || !availableAgreements.actionAgreementId) return

    setServicePdfChoiceOpen(false)
    setExportingServicePdf(true)
    setExportServicePdfError("")

    try {
      const { data, error } = await supabase
        .from("project_action_agreements")
        .select("*")
        .eq("id", availableAgreements.actionAgreementId)
        .single()

      if (error || !data) throw error ?? new Error("No encontrado")

      const advisorName =
        staffOptions.find((option) => option.id === data.advisor_id)?.name ??
        "Sin asignar"

      const activities = (
        data.activities as {
          description: string
          start_date: string
          end_date: string
          responsible: string
        }[]
      ).map((activity) => ({
        description: activity.description,
        startDate: activity.start_date,
        endDate: activity.end_date,
        responsible: activity.responsible,
      }))

      const pdfData: ActionAgreementPdfData = {
        businessName: selected.clients.business_name,
        representativeName: selected.clients.representative_name,
        projectName: data.project_name,
        serviceType: data.service_type,
        serviceQuantity: data.service_quantity ?? "",
        estimatedCompletionTime: data.estimated_completion_time ?? "",
        identifiedNeed: data.identified_need,
        serviceScope: data.service_scope,
        proposedSolution: data.proposed_solution,
        agreements: data.agreements,
        activities,
        advisorName,
        advisorSignature: data.advisor_signature,
        coordinatorName: data.coordinator_name,
        coordinatorSignature: data.coordinator_signature,
        clientSignature: data.client_signature,
        agreementDate: data.agreement_date,
      }

      const doc = await buildActionAgreementPdf(pdfData)
      doc.save(`acuerdo-acciones-${selected.clients.business_name}.pdf`)
    } catch {
      setExportServicePdfError("No pudimos generar el PDF. Intenta de nuevo.")
    }

    setExportingServicePdf(false)
  }

  async function handleExportCompletionAgreementPdf() {
    if (!selected || !availableAgreements.completionAgreementId) return

    setServicePdfChoiceOpen(false)
    setExportingServicePdf(true)
    setExportServicePdfError("")

    try {
      const { data, error } = await supabase
        .from("completion_agreements")
        .select("*")
        .eq("id", availableAgreements.completionAgreementId)
        .single()

      if (error || !data) throw error ?? new Error("No encontrado")

      const advisorName =
        staffOptions.find((option) => option.id === data.advisor_id)?.name ??
        "Sin asignar"

      const pdfData: CompletionAgreementPdfData = {
        businessName: selected.clients.business_name,
        representativeName: selected.clients.representative_name,
        advisorName,
        advisorSignature: data.advisor_signature,
        clientSignature: data.client_signature,
        agreementDate: data.agreement_date,
      }

      const doc = await buildAgreementPdf(pdfData)
      doc.save(`acuerdo-finalizacion-${selected.clients.business_name}.pdf`)
    } catch {
      setExportServicePdfError("No pudimos generar el PDF. Intenta de nuevo.")
    }

    setExportingServicePdf(false)
  }

  async function loadEvidenceCounts(requestId: string) {
    const { data } = await supabase
      .from("service_evidence_photos")
      .select("service_label")
      .eq("service_request_id", requestId)

    const counts = new Map<string, number>()
    for (const row of data ?? []) {
      counts.set(row.service_label, (counts.get(row.service_label) ?? 0) + 1)
    }
    setEvidenceCounts(counts)
  }

  async function openEvidenceModal(serviceLabel: string) {
    if (!selected) return

    setEvidenceService(serviceLabel)
    setEvidencePhotos(null)
    setEvidenceError("")

    const { data, error } = await supabase
      .from("service_evidence_photos")
      .select("id, photo_path")
      .eq("service_request_id", selected.id)
      .eq("service_label", serviceLabel)
      .order("created_at", { ascending: false })

    if (error || !data || data.length === 0) {
      setEvidencePhotos([])
      return
    }

    const { data: signedUrls } = await supabase.storage
      .from("evidencia-servicios")
      .createSignedUrls(
        data.map((row) => row.photo_path),
        300
      )

    setEvidencePhotos(
      data.map((row, index) => ({
        id: row.id,
        path: row.photo_path,
        url: signedUrls?.[index]?.signedUrl ?? "",
      }))
    )
  }

  function closeEvidenceModal() {
    setEvidenceService(null)
    setEvidencePhotos(null)
    setEvidenceError("")
  }

  async function handleUploadEvidence(files: FileList | null) {
    if (!files || files.length === 0 || !selected || !evidenceService) return

    setEvidenceUploading(true)
    setEvidenceError("")

    for (const file of Array.from(files)) {
      const extension = file.name.split(".").pop() || "jpg"
      const path = `${selected.id}/${crypto.randomUUID()}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from("evidencia-servicios")
        .upload(path, file, { contentType: file.type })

      if (uploadError) {
        setEvidenceError("No pudimos subir una de las imágenes.")
        continue
      }

      await supabase.from("service_evidence_photos").insert({
        service_request_id: selected.id,
        service_label: evidenceService,
        photo_path: path,
        uploaded_by: staffProfile?.name ?? "Usuario",
      })
    }

    setEvidenceUploading(false)
    await openEvidenceModal(evidenceService)
    await loadEvidenceCounts(selected.id)
  }

  async function handleDeleteEvidence(photoId: string, path: string) {
    if (!selected || !evidenceService) return

    await supabase.storage.from("evidencia-servicios").remove([path])
    await supabase.from("service_evidence_photos").delete().eq("id", photoId)

    await openEvidenceModal(evidenceService)
    await loadEvidenceCounts(selected.id)
  }

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

  // Columnas y valores calcados de la plantilla oficial "Matriz de
  // Asistencias Técnicas" (Viceministerio de Fomento a las Mipymes) para
  // que se pueda pegar directo ahí sin ajustes.
  function handleExportMipymesAsistidas() {
    if (!filteredRequests || filteredRequests.length === 0) return

    const rows = filteredRequests.map((request) => {
      const client = request.clients
      const isRecurring =
        (clientServiceCounts.get(request.client_id) ?? 1) > 1
      const advisor = staffOptions.find(
        (option) => option.id === request.assigned_advisor_id
      )

      return {
        Año: new Date(request.created_at).getFullYear(),
        Mes: monthNameFromDate(request.created_at),
        Trimestre: trimesterFromDate(request.created_at),
        "Nombre de la Mipyme asistida": client.business_name,
        "RNC/Cédula": client.rnc_number || client.id_number,
        "Provincia  donde está ubicada la Mipyme": client.province,
        "Municipio  donde está ubicada la Mipyme": client.municipality,
        "Región donde está ubicada la Mipyme":
          regionByProvince[client.province] ?? "",
        "Nombre del representante de la empresa o persona que solicita el servicio":
          client.representative_name,
        Género: client.sex === "femenino" ? "Femenino" : "Masculino",
        Edad: client.age,
        Teléfono: client.phone,
        "¿Es dueño de la empresa?":
          client.is_owner === "si"
            ? "Dueño o accionista"
            : "Gerente o representante",
        "Persona de contacto": client.representative_name,
        "Teléfono del contacto": client.phone,
        "Correo electrónico": client.email,
        "División/Centro": "LOYOLA y CPTT",
        "Asesor encargado": advisor?.name ?? "",
        "Empleos generados": "",
        "Aumento en ventas (Si aplica)": "",
        "Tipo de Clientes": isRecurring ? "Cliente Viejo" : "Cliente Nuevo",
        Observaciones: "",
      }
    })

    const from = dateFrom || "todas"
    const to = dateTo || "todas"
    downloadXlsx(
      rows,
      `mipymes_asistidas_${from}_a_${to}.xlsx`,
      "Mipymes Asistidas"
    )
  }

  function handleExportActividadEconomica() {
    if (!filteredRequests || filteredRequests.length === 0) return

    const rows = filteredRequests.map((request) => {
      const client = request.clients
      const sector =
        request.sector === "Otro" ? request.sector_other ?? "" : request.sector

      return {
        "Nombre de la Mipyme asistida": client.business_name,
        "RNC/Cédula": client.rnc_number || client.id_number,
        "Actividad Económica": sector,
        Productos: "",
      }
    })

    const from = dateFrom || "todas"
    const to = dateTo || "todas"
    downloadXlsx(
      rows,
      `actividad_economica_${from}_a_${to}.xlsx`,
      "Actividad Económica"
    )
  }

  function handleExportChoice(format: "mipymes" | "actividad") {
    setExportChoiceOpen(false)
    if (format === "mipymes") handleExportMipymesAsistidas()
    else handleExportActividadEconomica()
  }

  async function handleCopySignLink() {
    if (!selected) return
    const signUrl = `${window.location.origin}/firmar/${selected.id}`
    await navigator.clipboard.writeText(signUrl)
    setSignLinkCopied(true)
    setTimeout(() => setSignLinkCopied(false), 2000)
  }

  async function handleCopySurveyLink() {
    if (!selected) return
    const surveyUrl = `${window.location.origin}/encuesta-satisfaccion/publico/${selected.id}`
    await navigator.clipboard.writeText(surveyUrl)
    setSurveyLinkCopied(true)
    setTimeout(() => setSurveyLinkCopied(false), 2000)
  }

  async function loadRequests() {
    const { data, error } = await supabase
      .from("service_requests")
      .select(
        "id, created_at, client_id, sector, sector_other, business_description, start_date, employee_count, services, referral, referral_other, confidentiality, signature, status, assigned_advisor_id, assigned_coordinator_id, clients(id, business_name, has_rnc, rnc_number, province, municipality, representative_name, sex, age, phone, is_owner, id_number, email, address, id_photo_paths)"
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })

    if (error) {
      setError("No pudimos cargar los servicios. Intenta de nuevo más tarde.")
      return
    }

    setRequests(data as unknown as ServiceRequest[])
  }

  // Servicios con un Acuerdo de Acciones o de Finalización cuya firma del
  // cliente sigue pendiente -- se marca en la tarjeta para no tener que
  // abrir cada servicio para saberlo (ver el aviso ámbar en el detalle).
  async function loadPendingAgreementIds() {
    const [actionResult, completionResult] = await Promise.all([
      supabase
        .from("project_action_agreements")
        .select("service_request_id")
        .is("client_signature", null),
      supabase
        .from("completion_agreements")
        .select("service_request_id")
        .is("client_signature", null),
    ])

    const ids = new Set<string>()
    for (const row of actionResult.data ?? []) ids.add(row.service_request_id)
    for (const row of completionResult.data ?? []) ids.add(row.service_request_id)
    setPendingAgreementIds(ids)
  }

  async function handleRefresh() {
    setRefreshing(true)
    await Promise.all([loadRequests(), loadPendingAgreementIds()])
    setRefreshing(false)
  }

  useEffect(() => {
    loadRequests()
    loadPendingAgreementIds()
  }, [])

  useEffect(() => {
    supabase
      .from("staff")
      .select("id, name, email, role")
      .order("name", { ascending: true })
      .then(({ data }) =>
        setStaffOptions(
          (data ?? []).filter((option) => option.email !== CREATOR_EMAIL)
        )
      )
  }, [])

  async function loadIdPhotoUrls(paths: string[] | null) {
    setIdPhotoUrls(null)
    if (!paths || paths.length === 0) {
      setIdPhotoUrls([])
      return
    }

    const { data, error } = await supabase.storage
      .from("cedulas")
      .createSignedUrls(paths, 300)

    if (error) {
      setIdPhotoUrls([])
      return
    }

    setIdPhotoUrls(
      data
        .filter((item): item is typeof item & { signedUrl: string } =>
          Boolean(item.signedUrl)
        )
        .map((item) => ({
          url: item.signedUrl,
          isPdf: item.path?.toLowerCase().endsWith(".pdf") ?? false,
        }))
    )
  }

  function openRequest(request: ServiceRequest) {
    setSelected(request)
    setEditing(false)
    setSaveError("")
    setConfirmingDelete(false)
    setDeleteError("")
    setNewNoteBody("")
    setNewNoteScope("client")
    loadNotes(request)
    loadIdPhotoUrls(request.clients.id_photo_paths)
    loadEvidenceCounts(request.id)
    loadAvailableAgreements(request.id)
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

      if (advisorFilter !== "all") {
        if (advisorFilter === "unassigned") {
          if (request.assigned_advisor_id) return false
        } else if (request.assigned_advisor_id !== advisorFilter) {
          return false
        }
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
    advisorFilter,
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
    setIdPhotoUrls(null)
    setEvidenceCounts(new Map())
    closeEvidenceModal()
    setAvailableAgreements({
      actionAgreementId: null,
      completionAgreementId: null,
    })
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
        actor: staffProfile?.name ?? "Usuario",
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
        actor: staffProfile?.name ?? "Usuario",
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
      <h1 className="text-2xl font-semibold tracking-tight">Servicios</h1>

      {requests !== null && requests.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por negocio, representante, correo..."
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw
                  className={`size-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Actualizar
              </Button>
              {isAdmin && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={!filteredRequests || filteredRequests.length === 0}
                  onClick={() => setExportChoiceOpen(true)}
                >
                  <Download className="size-4" />
                  Exportar ({filteredRequests?.length ?? 0})
                </Button>
              )}
            </div>
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
            {(dateFrom ||
              dateTo ||
              clientStatusFilter !== "all" ||
              serviceStatusFilter !== "all" ||
              advisorFilter !== "all") && (
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
                  setAdvisorFilter("all")
                }}
              >
                Limpiar filtros
              </Button>
            )}
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
            <div className="flex flex-col gap-1">
              <Label htmlFor="filter-advisor" className="text-xs">
                Asesor encargado
              </Label>
              <Select
                id="filter-advisor"
                value={advisorFilter}
                onChange={(event) => setAdvisorFilter(event.target.value)}
                className="w-40"
              >
                <option value="all">Todos</option>
                <option value="unassigned">Sin asignar</option>
                {staffOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </div>
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
                  {pendingAgreementIds.has(request.id) && (
                    <Badge
                      variant="outline"
                      className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-400"
                    >
                      <Clock className="size-3" />
                      Firma de acuerdo pendiente
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
            <div className="flex flex-col items-end gap-2">
              {exportServicePdfError && (
                <p className="text-right text-sm text-destructive">
                  {exportServicePdfError}
                </p>
              )}
              <div className="flex flex-wrap justify-end gap-1.5 sm:flex-nowrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setServicePdfChoiceOpen(true)}
                  disabled={exportingServicePdf}
                >
                  <FileDown className="size-4" />
                  {exportingServicePdf ? "Generando..." : "Exportar PDF"}
                </Button>
                {selected && !selected.signature && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopySignLink}
                  >
                    {signLinkCopied ? (
                      <>
                        <Check className="size-4" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <LinkIcon className="size-4" />
                        Firmar
                      </>
                    )}
                  </Button>
                )}
                {selected && selected.status === "completo" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopySurveyLink}
                  >
                    {surveyLinkCopied ? (
                      <>
                        <Check className="size-4" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <LinkIcon className="size-4" />
                        Encuesta
                      </>
                    )}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmingDelete(true)}
                >
                  <Trash2 className="size-4" />
                  Eliminar
                </Button>
                <Button type="button" size="sm" onClick={startEditing}>
                  <Pencil className="size-4" />
                  Editar
                </Button>
              </div>
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

            {(pendingAgreements.actionAgreementId ||
              pendingAgreements.completionAgreementId) && (
              <div className="flex flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 dark:border-amber-400/30 dark:bg-amber-400/10">
                {pendingAgreements.actionAgreementId && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      Acuerdo de Acciones: esperando firma del cliente
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyActionAgreementSignLink}
                    >
                      {actionSignLinkCopied ? (
                        <>
                          <Check className="size-4" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <LinkIcon className="size-4" />
                          Copiar enlace
                        </>
                      )}
                    </Button>
                  </div>
                )}
                {pendingAgreements.completionAgreementId && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      Acuerdo de Finalización: esperando firma del cliente
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyCompletionAgreementSignLink}
                    >
                      {completionSignLinkCopied ? (
                        <>
                          <Check className="size-4" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <LinkIcon className="size-4" />
                          Copiar enlace
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

            <DetailRow
              label="Asesor encargado"
              value={
                staffOptions.find(
                  (option) => option.id === selected.assigned_advisor_id
                )?.name ?? "Sin asignar"
              }
            />
            <DetailRow
              label="Coordinador(a) encargado"
              value={
                staffOptions.find(
                  (option) => option.id === selected.assigned_coordinator_id
                )?.name ?? "Sin asignar"
              }
            />
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailRow
                label="Sexo"
                value={
                  selected.clients.sex === "femenino" ? "Femenino" : "Masculino"
                }
              />
              <DetailRow label="Edad" value={selected.clients.age} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Fotografías de la cédula
              </span>
              {idPhotoUrls === null && (
                <p className="text-xs text-muted-foreground">Cargando...</p>
              )}
              {idPhotoUrls !== null && idPhotoUrls.length === 0 && (
                <p className="text-sm">—</p>
              )}
              {idPhotoUrls !== null && idPhotoUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {idPhotoUrls.map(({ url, isPdf }) =>
                    isPdf ? (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-28 w-40 flex-col items-center justify-center gap-1.5 rounded-lg border text-muted-foreground hover:bg-muted"
                      >
                        <FileText className="size-6" />
                        <span className="text-xs">Ver PDF</span>
                      </a>
                    ) : (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden rounded-lg border"
                      >
                        <img
                          src={url}
                          alt="Foto de cédula"
                          className="h-28 w-40 object-cover"
                        />
                      </a>
                    )
                  )}
                </div>
              )}
            </div>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  {selected.services.map((service) => {
                    const count = evidenceCounts.get(service) ?? 0
                    return (
                      <button
                        key={service}
                        type="button"
                        onClick={() => openEvidenceModal(service)}
                        className="inline-flex"
                      >
                        <Badge
                          variant="outline"
                          className="cursor-pointer gap-1 hover:bg-accent"
                        >
                          <ImagePlus className="size-3" />
                          {service}
                          {count > 0 && (
                            <span className="text-muted-foreground">
                              ({count})
                            </span>
                          )}
                        </Badge>
                      </button>
                    )
                  })}
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
              <Label>Estado del servicio</Label>
              <p className="text-sm">
                {serviceStatusLabel(editValues.status)}
              </p>
              <p className="text-xs text-muted-foreground">
                El estado lo establece cada formulario: "En proceso" desde
                el Acuerdo de Acciones del Proyecto, y "Completo" desde el
                Acuerdo de Finalización.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-advisor">Asesor encargado</Label>
              <Select
                id="edit-advisor"
                value={editValues.assigned_advisor_id ?? ""}
                onChange={(event) =>
                  updateEditValue(
                    "assigned_advisor_id",
                    event.target.value || null
                  )
                }
              >
                <option value="">Sin asignar</option>
                {staffOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-coordinator">Coordinador(a) encargado</Label>
              <Select
                id="edit-coordinator"
                value={editValues.assigned_coordinator_id ?? ""}
                onChange={(event) =>
                  updateEditValue(
                    "assigned_coordinator_id",
                    event.target.value || null
                  )
                }
              >
                <option value="">Sin asignar</option>
                {staffOptions
                  .filter((option) => option.role === "administrador")
                  .map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      {exportChoiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-lg">
            <h2 className="text-base font-semibold">Elige el formato</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Respeta los filtros que están aplicados en pantalla.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="justify-start"
                onClick={() => handleExportChoice("mipymes")}
              >
                Mipymes Asistidas
              </Button>
              <Button
                type="button"
                variant="outline"
                className="justify-start"
                onClick={() => handleExportChoice("actividad")}
              >
                Actividad Económica
              </Button>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setExportChoiceOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {evidenceService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col gap-4 rounded-lg border bg-background p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">Evidencia</h2>
                <p className="text-sm text-muted-foreground">
                  {evidenceService}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Cerrar evidencia"
                onClick={closeEvidenceModal}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {evidencePhotos === null && (
                <p className="text-sm text-muted-foreground">Cargando...</p>
              )}
              {evidencePhotos !== null && evidencePhotos.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Todavía no hay imágenes para este servicio.
                </p>
              )}
              {evidencePhotos !== null && evidencePhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {evidencePhotos.map((photo) => (
                    <div key={photo.id} className="group relative">
                      <a href={photo.url} target="_blank" rel="noreferrer">
                        <img
                          src={photo.url}
                          alt="Evidencia del servicio"
                          className="aspect-square w-full rounded-lg border object-cover"
                        />
                      </a>
                      <button
                        type="button"
                        aria-label="Borrar imagen"
                        onClick={() =>
                          handleDeleteEvidence(photo.id, photo.path)
                        }
                        className="absolute top-1 right-1 rounded-full bg-background/90 p-1 text-muted-foreground opacity-0 shadow-xs transition-opacity group-hover:opacity-100 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {evidenceError && (
              <p className="text-sm text-destructive">{evidenceError}</p>
            )}

            <label>
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                disabled={evidenceUploading}
                onChange={(event) => handleUploadEvidence(event.target.files)}
              />
              <span
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "w-full cursor-pointer",
                  evidenceUploading && "pointer-events-none opacity-50"
                )}
              >
                <ImagePlus className="size-4" />
                {evidenceUploading ? "Subiendo..." : "Agregar imagen"}
              </span>
            </label>
          </div>
        </div>
      )}

      {servicePdfChoiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-lg">
            <h2 className="text-base font-semibold">Elige qué exportar</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cada formulario se descarga como su propio PDF.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="justify-start"
                onClick={handleExportServicePdf}
              >
                Solicitud de Servicios
              </Button>
              <Button
                type="button"
                variant="outline"
                className="justify-start"
                disabled={!availableAgreements.actionAgreementId}
                onClick={handleExportActionAgreementPdf}
              >
                Acuerdo de Acciones del Proyecto
                {!availableAgreements.actionAgreementId && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    No disponible
                  </span>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="justify-start"
                disabled={!availableAgreements.completionAgreementId}
                onClick={handleExportCompletionAgreementPdf}
              >
                Acuerdo de Finalización
                {!availableAgreements.completionAgreementId && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    No disponible
                  </span>
                )}
              </Button>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setServicePdfChoiceOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
