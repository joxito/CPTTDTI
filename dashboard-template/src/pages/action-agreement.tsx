import { useEffect, useMemo, useState } from "react"
import jsPDF from "jspdf"
import { FileDown } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Combobox } from "@/components/ui/combobox"
import { SignatureCanvas } from "@/components/ui/signature-canvas"
import { CREATOR_EMAIL, useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"

type ServiceOption = {
  id: string
  client_id: string
  created_at: string
  sector: string
  status: string
  assigned_advisor_id: string | null
  assigned_coordinator_id: string | null
  business_name: string
  representative_name: string
}

type StaffOption = {
  id: string
  name: string
  signature: string | null
  role: string
}

export type Activity = {
  description: string
  startDate: string
  endDate: string
  responsible: string
}

const emptyActivity: Activity = {
  description: "",
  startDate: "",
  endDate: "",
  responsible: "",
}

function todayIso() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
}

function serviceLabel(service: ServiceOption) {
  return `${service.business_name} — ${service.representative_name} · ${service.sector}`
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

const CONSIDERATIONS_TEXT =
  "Consideraciones del servicio: Cada proyecto podrá contemplar un máximo de dos (2) modificaciones o ajustes, de acuerdo con el alcance previamente establecido. Asimismo, cada cliente podrá recibir hasta dos (2) asistencias técnicas durante el mismo año, conforme a los criterios y lineamientos establecidos por el Centro."

const IMPACT_INTRO_TEXT =
  "Con la ayuda del Centro de Prototipado y Transferencia Tecnológica, se esperan lograr los siguientes resultados:"

const IMPACT_BODY_TEXT =
  "Luego de agotar un proceso de investigación, análisis y desarrollo del producto o servicio se busca hacer las mejoras de lugar, para ofrecer un producto único que pueda brindar un valor agregado al beneficiario final, y que cumpla con los requerimientos nacionales e internacionales."

type SubmittedAgreement = {
  service: ServiceOption
  projectName: string
  serviceType: string
  serviceQuantity: string
  estimatedCompletionTime: string
  identifiedNeed: string
  serviceScope: string
  proposedSolution: string
  agreements: string
  activities: Activity[]
  advisorName: string
  advisorSignature: string
  coordinatorName: string
  coordinatorSignature: string
  clientSignature: string
  agreementDate: string
}

export type ActionAgreementPdfData = {
  businessName: string
  representativeName: string
  projectName: string
  serviceType: string
  serviceQuantity: string
  estimatedCompletionTime: string
  identifiedNeed: string
  serviceScope: string
  proposedSolution: string
  agreements: string
  activities: Activity[]
  advisorName: string
  advisorSignature: string
  coordinatorName: string
  coordinatorSignature: string
  clientSignature: string
  agreementDate: string
}

// Genera el PDF a mano (en vez de imprimir el HTML) para que el
// documento no lleve el encabezado/pie que agrega el navegador al
// imprimir (URL, fecha, título de la página). Dos columnas y fuente
// compacta para que quepa en la menor cantidad de páginas posible.
export async function buildActionAgreementPdf(
  agreement: ActionAgreementPdfData
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
    value: string | null | undefined,
    width = colWidth
  ) {
    const text = value === null || value === undefined || value === "" ? "—" : value
    ensureSpace(cursor, 4)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(7.5)
    doc.text(label, cursor.x, cursor.y)
    cursor.y += 3.6
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    const lines = doc.splitTextToSize(text, width)
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
  doc.text("Acuerdo de Acciones del Proyecto", margin + logoWidth + 6, margin + 6)
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

  addSectionTitle(left, "Datos del Proyecto")
  addField(left, "Nombre del Cliente", agreement.businessName)
  addField(left, "Contacto", agreement.representativeName)
  addField(left, "Nombre Proyecto", agreement.projectName)
  addField(left, "Tipo de servicio", agreement.serviceType)
  addField(left, "Cantidad de servicio", agreement.serviceQuantity)
  addField(
    left,
    "Tiempo Estimado de Finalización",
    agreement.estimatedCompletionTime
  )

  addSectionTitle(left, "Temas Tratados en Reunión")
  addField(left, "Necesidad identificada", agreement.identifiedNeed)
  addField(left, "Alcance del servicio", agreement.serviceScope)
  addField(left, "Propuesta o solución planteada", agreement.proposedSolution)
  addField(left, "Acuerdos", agreement.agreements)

  addSectionTitle(right, "Plan de Acción")
  agreement.activities.forEach((activity, index) => {
    addField(right, `Actividad #${index + 1}`, activity.description)
    addField(right, "Inicio", activity.startDate)
    addField(right, "Fecha Estimada de Finalización", activity.endDate)
    addField(right, "Responsable", activity.responsible)
  })

  addSectionTitle(right, "Impacto Proyectado en su Empresa")
  addField(right, "", `${IMPACT_INTRO_TEXT} ${IMPACT_BODY_TEXT}`)

  const fullWidthCursor: Cursor = { x: margin, y: Math.max(left.y, right.y) }
  addSectionTitle(fullWidthCursor, "Consideraciones del servicio", contentWidth)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)
  const considerationsLines = doc.splitTextToSize(
    CONSIDERATIONS_TEXT,
    contentWidth
  )
  ensureSpace(fullWidthCursor, considerationsLines.length * 3.2)
  doc.text(considerationsLines, margin, fullWidthCursor.y)
  fullWidthCursor.y += considerationsLines.length * 3.2 + 6

  addSectionTitle(fullWidthCursor, "Firmas", contentWidth)
  const sigColWidth = (contentWidth - 16) / 3
  const sigHeight = 16
  const sigWidth = Math.min(sigHeight * (500 / 200), sigColWidth)
  ensureSpace(fullWidthCursor, sigHeight + 12)

  const sigCols = [
    { label: "Cliente", name: null, signature: agreement.clientSignature },
    {
      label: "Asesor(a)",
      name: agreement.advisorName,
      signature: agreement.advisorSignature,
    },
    {
      label: "Coordinador(a)",
      name: agreement.coordinatorName,
      signature: agreement.coordinatorSignature,
    },
  ]

  sigCols.forEach((col, index) => {
    const x = margin + index * (sigColWidth + 8)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.text(col.label, x, fullWidthCursor.y)
    if (col.name) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(7.5)
      doc.text(col.name, x, fullWidthCursor.y + 3.5)
    }
    doc.addImage(
      col.signature,
      "PNG",
      x,
      fullWidthCursor.y + 5,
      sigWidth,
      sigHeight
    )
    doc.setDrawColor(200)
    doc.line(
      x,
      fullWidthCursor.y + 5 + sigHeight + 1,
      x + sigColWidth,
      fullWidthCursor.y + 5 + sigHeight + 1
    )
  })
  fullWidthCursor.y += 5 + sigHeight + 6

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  ensureSpace(fullWidthCursor, 5)
  doc.text(`Fecha: ${agreement.agreementDate}`, margin, fullWidthCursor.y)
  fullWidthCursor.y += 8

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

export default function ActionAgreementPage() {
  const { staffProfile } = useAuth()
  const [services, setServices] = useState<ServiceOption[]>([])
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([])
  const [selectedServiceId, setSelectedServiceId] = useState("")
  const [advisorId, setAdvisorId] = useState("")
  const [coordinatorId, setCoordinatorId] = useState("")
  const [projectName, setProjectName] = useState("")
  const [serviceType, setServiceType] = useState("")
  const [serviceQuantity, setServiceQuantity] = useState("")
  const [estimatedCompletionTime, setEstimatedCompletionTime] = useState("")
  const [identifiedNeed, setIdentifiedNeed] = useState("")
  const [serviceScope, setServiceScope] = useState("")
  const [proposedSolution, setProposedSolution] = useState("")
  const [agreements, setAgreements] = useState("")
  const [activities, setActivities] = useState<Activity[]>([
    { ...emptyActivity },
    { ...emptyActivity },
    { ...emptyActivity },
  ])
  const [clientSignature, setClientSignature] = useState("")
  const [agreementDate, setAgreementDate] = useState(todayIso())
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [submitted, setSubmitted] = useState<SubmittedAgreement | null>(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [pdfError, setPdfError] = useState("")

  useEffect(() => {
    supabase
      .from("service_requests")
      .select(
        "id, client_id, created_at, sector, status, assigned_advisor_id, assigned_coordinator_id, clients(business_name, representative_name)"
      )
      .eq("status", "iniciado")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setServices(
          (data ?? []).map((row) => {
            const client = row.clients as unknown as {
              business_name: string
              representative_name: string
            }
            return {
              id: row.id,
              client_id: row.client_id,
              created_at: row.created_at,
              sector: row.sector,
              status: row.status,
              assigned_advisor_id: row.assigned_advisor_id,
              assigned_coordinator_id: row.assigned_coordinator_id,
              business_name: client.business_name,
              representative_name: client.representative_name,
            }
          })
        )
      })
  }, [])

  useEffect(() => {
    supabase
      .from("staff")
      .select("id, name, signature, role, email")
      .order("name", { ascending: true })
      .then(({ data }) =>
        setStaffOptions(
          (data ?? []).filter((option) => option.email !== CREATOR_EMAIL)
        )
      )
  }, [])

  const serviceOptionsMap = useMemo(() => {
    const map = new Map<string, ServiceOption>()
    for (const service of services) map.set(serviceLabel(service), service)
    return map
  }, [services])

  const selectedService = services.find((s) => s.id === selectedServiceId)
  const selectedAdvisor = staffOptions.find((s) => s.id === advisorId)
  const selectedCoordinator = staffOptions.find((s) => s.id === coordinatorId)
  const coordinatorOptions = staffOptions.filter(
    (option) => option.role === "administrador"
  )
  const filledActivities = activities.filter((a) => a.description.trim())

  function handleSelectService(label: string) {
    const service = serviceOptionsMap.get(label)
    setSelectedServiceId(service?.id ?? "")
    setAdvisorId(service?.assigned_advisor_id ?? "")
    setCoordinatorId(service?.assigned_coordinator_id ?? "")
  }

  function updateActivity(
    index: number,
    field: keyof Activity,
    value: string
  ) {
    setActivities((current) =>
      current.map((activity, i) =>
        i === index ? { ...activity, [field]: value } : activity
      )
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedService || !advisorId || !selectedAdvisor?.signature) return
    if (!coordinatorId || !selectedCoordinator?.signature) return
    if (!clientSignature) return
    if (filledActivities.length === 0) return

    setSubmitting(true)
    setSubmitError("")

    const { error } = await supabase.from("project_action_agreements").insert({
      service_request_id: selectedService.id,
      project_name: projectName,
      service_type: serviceType,
      service_quantity: serviceQuantity || null,
      estimated_completion_time: estimatedCompletionTime || null,
      identified_need: identifiedNeed,
      service_scope: serviceScope,
      proposed_solution: proposedSolution,
      agreements,
      activities: filledActivities.map((a) => ({
        description: a.description,
        start_date: a.startDate,
        end_date: a.endDate,
        responsible: a.responsible,
      })),
      advisor_id: advisorId,
      advisor_signature: selectedAdvisor.signature,
      coordinator_name: selectedCoordinator.name,
      coordinator_signature: selectedCoordinator.signature,
      client_signature: clientSignature,
      agreement_date: agreementDate,
    })

    if (error) {
      setSubmitting(false)
      setSubmitError(
        "No pudimos guardar el acuerdo. Intenta de nuevo en unos minutos."
      )
      return
    }

    // El acuerdo firmado es lo único que puede mover un servicio a "En
    // proceso" — no hay forma de ponerlo así a mano desde Servicios.
    await supabase
      .from("service_requests")
      .update({ status: "en_proceso" })
      .eq("id", selectedService.id)

    await supabase.from("service_request_changes").insert({
      service_request_id: selectedService.id,
      business_name: selectedService.business_name,
      action: "editado",
      changed_fields: { status: { from: "iniciado", to: "en_proceso" } },
      actor: staffProfile?.name ?? "Usuario",
    })

    setSubmitting(false)

    setSubmitted({
      service: selectedService,
      projectName,
      serviceType,
      serviceQuantity,
      estimatedCompletionTime,
      identifiedNeed,
      serviceScope,
      proposedSolution,
      agreements,
      activities: filledActivities,
      advisorName: selectedAdvisor.name,
      advisorSignature: selectedAdvisor.signature,
      coordinatorName: selectedCoordinator.name,
      coordinatorSignature: selectedCoordinator.signature,
      clientSignature,
      agreementDate,
    })
  }

  function handleNewAgreement() {
    setSubmitted(null)
    setSelectedServiceId("")
    setAdvisorId("")
    setProjectName("")
    setServiceType("")
    setServiceQuantity("")
    setEstimatedCompletionTime("")
    setIdentifiedNeed("")
    setServiceScope("")
    setProposedSolution("")
    setAgreements("")
    setActivities([{ ...emptyActivity }, { ...emptyActivity }, { ...emptyActivity }])
    setCoordinatorId("")
    setClientSignature("")
    setAgreementDate(todayIso())
  }

  async function handleExportPdf() {
    if (!submitted) return

    setGeneratingPdf(true)
    setPdfError("")

    try {
      const doc = await buildActionAgreementPdf({
        businessName: submitted.service.business_name,
        representativeName: submitted.service.representative_name,
        projectName: submitted.projectName,
        serviceType: submitted.serviceType,
        serviceQuantity: submitted.serviceQuantity,
        estimatedCompletionTime: submitted.estimatedCompletionTime,
        identifiedNeed: submitted.identifiedNeed,
        serviceScope: submitted.serviceScope,
        proposedSolution: submitted.proposedSolution,
        agreements: submitted.agreements,
        activities: submitted.activities,
        advisorName: submitted.advisorName,
        advisorSignature: submitted.advisorSignature,
        coordinatorName: submitted.coordinatorName,
        coordinatorSignature: submitted.coordinatorSignature,
        clientSignature: submitted.clientSignature,
        agreementDate: submitted.agreementDate,
      })
      doc.save(`acuerdo-acciones-${submitted.service.business_name}.pdf`)
    } catch {
      setPdfError("No pudimos generar el PDF. Intenta de nuevo.")
    }

    setGeneratingPdf(false)
  }

  if (submitted) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            Acuerdo de Acciones del Proyecto
          </h1>
          <Button type="button" onClick={handleExportPdf} disabled={generatingPdf}>
            <FileDown className="size-4" />
            {generatingPdf ? "Generando..." : "Exportar PDF"}
          </Button>
        </div>
        {pdfError && <p className="text-sm text-destructive">{pdfError}</p>}

        <Card>
          <CardContent className="flex flex-col gap-6 py-8">
            <img
              src="/cptt-logo.png"
              alt="CPTTL"
              className="mx-auto w-[min(90%,320px)]"
            />

            <table className="w-full border-collapse border-t text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="w-32 py-2 pr-4 font-medium">
                    Nombre del Cliente
                  </td>
                  <td className="py-2">{submitted.service.business_name}</td>
                  <td className="py-2 pr-4 pl-6 font-medium">Contacto</td>
                  <td className="py-2">
                    {submitted.service.representative_name}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4 font-medium">Nombre Proyecto</td>
                  <td className="py-2" colSpan={3}>
                    {submitted.projectName}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4 font-medium">Tipo de servicio</td>
                  <td className="py-2">{submitted.serviceType}</td>
                  <td className="py-2 pr-4 pl-6 font-medium">Cantidad</td>
                  <td className="py-2">{submitted.serviceQuantity || "—"}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">
                    Tiempo Estimado de Finalización
                  </td>
                  <td className="py-2" colSpan={3}>
                    {submitted.estimatedCompletionTime || "—"}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="flex flex-col gap-3">
              <p className="font-medium">Temas Tratados en Reunión</p>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Necesidad identificada
                </p>
                <p className="text-sm">{submitted.identifiedNeed}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Alcance del servicio
                </p>
                <p className="text-sm">{submitted.serviceScope}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Propuesta o solución planteada
                </p>
                <p className="text-sm">{submitted.proposedSolution}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Acuerdos
                </p>
                <p className="text-sm">{submitted.agreements}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {CONSIDERATIONS_TEXT}
              </p>
            </div>

            <div className="flex flex-col gap-3 border-t pt-4">
              <p className="font-medium">Plan de Acción</p>
              {submitted.activities.map((activity, index) => (
                <div key={index} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">
                    Actividad #{index + 1}: {activity.description}
                  </p>
                  <div className="mt-1 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <span>Inicio: {activity.startDate || "—"}</span>
                    <span>Fin estimado: {activity.endDate || "—"}</span>
                    <span>Responsable: {activity.responsible || "—"}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-1 border-t pt-4">
              <p className="font-medium">Impacto Proyectado en su Empresa</p>
              <p className="text-sm text-muted-foreground">
                {IMPACT_INTRO_TEXT} {IMPACT_BODY_TEXT}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t pt-4">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">Cliente</p>
                <img
                  src={submitted.clientSignature}
                  alt="Firma del cliente"
                  className="-mb-3 h-14 self-center object-contain"
                />
                <div className="border-t" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">Asesor(a)</p>
                <p className="text-xs text-muted-foreground">
                  {submitted.advisorName}
                </p>
                <img
                  src={submitted.advisorSignature}
                  alt="Firma del asesor"
                  className="-mb-3 h-14 self-center object-contain"
                />
                <div className="border-t" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">Coordinador(a)</p>
                <p className="text-xs text-muted-foreground">
                  {submitted.coordinatorName}
                </p>
                <img
                  src={submitted.coordinatorSignature}
                  alt="Firma del coordinador"
                  className="-mb-3 h-14 self-center object-contain"
                />
                <div className="border-t" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Fecha: {submitted.agreementDate}
            </p>

            <img
              src="/logos-institucionales.png"
              alt="Gobierno de la República Dominicana - MICM, OEA, Instituto Politécnico Loyola"
              className="mx-auto mt-4 w-full max-w-md"
            />
          </CardContent>
        </Card>

        <Button
          type="button"
          variant="outline"
          onClick={handleNewAgreement}
          className="self-start"
        >
          Crear otro acuerdo
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Acuerdo de Acciones del Proyecto
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card>
          <CardHeader className="border-b pb-4">
            <CardDescription>
              Acta de arranque del proyecto: temas tratados en la reunión y
              plan de acción. Al guardarla, el servicio pasa a "En proceso".
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-5 pt-6 pb-6">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="service">Servicio</Label>
              <Combobox
                id="service"
                options={Array.from(serviceOptionsMap.keys())}
                value={selectedService ? serviceLabel(selectedService) : ""}
                onValueChange={handleSelectService}
                placeholder="Busca por negocio o representante"
                searchPlaceholder="Buscar servicio..."
                emptyMessage="No hay servicios iniciados"
                required
              />
              <p className="text-xs text-muted-foreground">
                Solo se muestran los servicios marcados "Inició".
              </p>
            </div>

            {selectedService && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>Nombre del Cliente</Label>
                    <p className="text-sm">{selectedService.business_name}</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Contacto</Label>
                    <p className="text-sm">
                      {selectedService.representative_name}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="projectName">Nombre Proyecto</Label>
                  <Input
                    id="projectName"
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="serviceType">Tipo de servicio</Label>
                    <Input
                      id="serviceType"
                      value={serviceType}
                      onChange={(event) => setServiceType(event.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="serviceQuantity">
                      Cantidad de servicio
                    </Label>
                    <Input
                      id="serviceQuantity"
                      value={serviceQuantity}
                      onChange={(event) =>
                        setServiceQuantity(event.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="estimatedCompletionTime">
                    Tiempo Estimado de Finalización
                  </Label>
                  <Input
                    id="estimatedCompletionTime"
                    value={estimatedCompletionTime}
                    onChange={(event) =>
                      setEstimatedCompletionTime(event.target.value)
                    }
                    placeholder="Ej. 2 meses"
                  />
                </div>

                <div className="flex flex-col gap-1.5 border-t pt-4">
                  <Label htmlFor="identifiedNeed">
                    Necesidad identificada
                  </Label>
                  <Textarea
                    id="identifiedNeed"
                    value={identifiedNeed}
                    onChange={(event) =>
                      setIdentifiedNeed(event.target.value)
                    }
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="serviceScope">Alcance del servicio</Label>
                  <Textarea
                    id="serviceScope"
                    value={serviceScope}
                    onChange={(event) => setServiceScope(event.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="proposedSolution">
                    Propuesta o solución planteada
                  </Label>
                  <Textarea
                    id="proposedSolution"
                    value={proposedSolution}
                    onChange={(event) =>
                      setProposedSolution(event.target.value)
                    }
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="agreements">Acuerdos</Label>
                  <Textarea
                    id="agreements"
                    value={agreements}
                    onChange={(event) => setAgreements(event.target.value)}
                    required
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  {CONSIDERATIONS_TEXT}
                </p>

                <div className="flex flex-col gap-3 border-t pt-4">
                  <Label>Plan de Acción</Label>
                  {activities.map((activity, index) => (
                    <div
                      key={index}
                      className="flex flex-col gap-2 rounded-lg border p-3"
                    >
                      <Label
                        htmlFor={`activity-${index}-description`}
                        className="text-xs"
                      >
                        Actividad #{index + 1}
                        {index === 0 && <span className="text-destructive"> *</span>}
                      </Label>
                      <Input
                        id={`activity-${index}-description`}
                        value={activity.description}
                        onChange={(event) =>
                          updateActivity(index, "description", event.target.value)
                        }
                        placeholder="Descripción de la actividad"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <Label
                            htmlFor={`activity-${index}-start`}
                            className="text-xs text-muted-foreground"
                          >
                            Inicio
                          </Label>
                          <Input
                            id={`activity-${index}-start`}
                            type="date"
                            value={activity.startDate}
                            onChange={(event) =>
                              updateActivity(index, "startDate", event.target.value)
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label
                            htmlFor={`activity-${index}-end`}
                            className="text-xs text-muted-foreground"
                          >
                            Fecha Estimada de Finalización
                          </Label>
                          <Input
                            id={`activity-${index}-end`}
                            type="date"
                            value={activity.endDate}
                            onChange={(event) =>
                              updateActivity(index, "endDate", event.target.value)
                            }
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label
                          htmlFor={`activity-${index}-responsible`}
                          className="text-xs text-muted-foreground"
                        >
                          Responsable
                        </Label>
                        <Input
                          id={`activity-${index}-responsible`}
                          value={activity.responsible}
                          onChange={(event) =>
                            updateActivity(index, "responsible", event.target.value)
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-1 border-t pt-4">
                  <Label>Impacto Proyectado en su Empresa</Label>
                  <p className="text-xs text-muted-foreground">
                    {IMPACT_INTRO_TEXT} {IMPACT_BODY_TEXT}
                  </p>
                </div>

                <div className="flex flex-col gap-1.5 border-t pt-4">
                  <Label htmlFor="advisor">Asesor(a)</Label>
                  <Select
                    id="advisor"
                    value={advisorId}
                    onChange={(event) => setAdvisorId(event.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Selecciona una opción
                    </option>
                    {staffOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </Select>
                  {advisorId &&
                    (selectedAdvisor?.signature ? (
                      <img
                        src={selectedAdvisor.signature}
                        alt="Firma del asesor"
                        className="h-20 w-fit rounded-lg border bg-white p-2"
                      />
                    ) : (
                      <p className="text-sm text-destructive">
                        Este asesor no tiene firma registrada. Puede
                        agregarla en Configuración → Perfil.
                      </p>
                    ))}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="coordinator">Coordinador(a)</Label>
                  <Select
                    id="coordinator"
                    value={coordinatorId}
                    onChange={(event) => setCoordinatorId(event.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Selecciona una opción
                    </option>
                    {coordinatorOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </Select>
                  {coordinatorId &&
                    (selectedCoordinator?.signature ? (
                      <img
                        src={selectedCoordinator.signature}
                        alt="Firma del coordinador"
                        className="h-20 w-fit rounded-lg border bg-white p-2"
                      />
                    ) : (
                      <p className="text-sm text-destructive">
                        Este coordinador(a) no tiene firma registrada. Puede
                        agregarla en Configuración → Perfil.
                      </p>
                    ))}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Firma Cliente</Label>
                  <SignatureCanvas
                    value={clientSignature}
                    onChange={setClientSignature}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="agreementDate">Fecha</Label>
                  <Input
                    id="agreementDate"
                    type="date"
                    value={agreementDate}
                    onChange={(event) => setAgreementDate(event.target.value)}
                    required
                    className="w-48"
                  />
                </div>
              </>
            )}

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}
          </CardContent>
        </Card>

        <Button
          type="submit"
          disabled={
            submitting ||
            !selectedService ||
            !advisorId ||
            !selectedAdvisor?.signature ||
            !coordinatorId ||
            !selectedCoordinator?.signature ||
            !clientSignature ||
            filledActivities.length === 0
          }
          className="self-end"
        >
          {submitting ? "Guardando..." : "Guardar acuerdo"}
        </Button>
      </form>
    </div>
  )
}
