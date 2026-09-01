import { useEffect, useMemo, useState } from "react"
import jsPDF from "jspdf"
import { Check, FileDown, Link as LinkIcon } from "lucide-react"

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
  business_name: string
  representative_name: string
}

type StaffOption = {
  id: string
  name: string
  signature: string | null
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

type SubmittedAgreement = {
  service: ServiceOption
  advisorName: string
  advisorSignature: string
  clientSignature: string
  agreementDate: string
}

export type CompletionAgreementPdfData = {
  businessName: string
  advisorName: string
  advisorSignature: string
  clientSignature: string
  agreementDate: string
}

function loadImageDataUrl(url: string): Promise<string> {
  return fetch(url)
    .then((res) => res.blob())
    .then(
      (blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(new Error("No se pudo cargar la imagen"))
          reader.readAsDataURL(blob)
        })
    )
}

const CLIENT_STATEMENTS = [
  "Se encuentra conforme con los entregables del proyecto realizado.",
  "Se compromete a proveer información necesaria para que el Centro de Prototipado y Transferencia Tecnológica pueda realizar la Encuesta de Evaluación del Impacto Económico generado a través de la asesoría recibida.",
  "Autoriza al Centro de Prototipado y Transferencia Tecnológica a utilizar su testimonio en los soportes publicitarios y/o promocionales disponibles en los medios impresos y digitales.",
]

// Genera el PDF a mano (en vez de imprimir el HTML) para que el
// documento no lleve el encabezado/pie que agrega el navegador al
// imprimir (URL, fecha, título de la página).
export async function buildAgreementPdf(agreement: CompletionAgreementPdfData) {
  const doc = new jsPDF({ unit: "mm", format: "letter" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = 18

  const [logo, footerLogos] = await Promise.all([
    loadImageDataUrl("/cptt-logo.png"),
    loadImageDataUrl("/logos-institucionales.png"),
  ])

  const logoWidth = 70
  const logoHeight = logoWidth / (439 / 109)
  doc.addImage(logo, "PNG", (pageWidth - logoWidth) / 2, y, logoWidth, logoHeight)
  y += logoHeight + 8

  doc.setDrawColor(200)
  doc.line(margin, y, margin + contentWidth, y)
  y += 6
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("Cliente", margin, y)
  doc.setFont("helvetica", "normal")
  doc.text(agreement.businessName, margin + 25, y)
  y += 4
  doc.line(margin, y, margin + contentWidth, y)
  y += 6
  doc.setFont("helvetica", "bold")
  doc.text("Asesor", margin, y)
  doc.setFont("helvetica", "normal")
  doc.text(agreement.advisorName, margin + 25, y)
  doc.setFont("helvetica", "bold")
  doc.text("Fecha", margin + 95, y)
  doc.setFont("helvetica", "normal")
  doc.text(agreement.agreementDate, margin + 115, y)
  y += 4
  doc.line(margin, y, margin + contentWidth, y)
  y += 12

  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text("El asesor:", margin, y)
  y += 6
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  const advisorLines = doc.splitTextToSize(
    "Indica que ha completado las actividades acordadas en el documento Acuerdo de Acciones de su proyecto, en el tiempo y alcance esperado.",
    contentWidth
  )
  doc.text(advisorLines, margin, y)
  y += advisorLines.length * 5 + 8

  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text("El cliente:", margin, y)
  y += 6
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  for (const statement of CLIENT_STATEMENTS) {
    const lines = doc.splitTextToSize(statement, contentWidth)
    doc.text(lines, margin, y)
    y += lines.length * 5 + 3
  }
  y += 10

  const sigColWidth = contentWidth / 2 - 5
  const sigHeight = 18
  const sigWidth = Math.min(sigHeight * (500 / 200), sigColWidth)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text("Firma Asesor", margin, y)
  doc.text("Firma Cliente", margin + sigColWidth + 10, y)
  y += 3

  doc.addImage(agreement.advisorSignature, "PNG", margin, y, sigWidth, sigHeight)
  doc.addImage(
    agreement.clientSignature,
    "PNG",
    margin + sigColWidth + 10,
    y,
    sigWidth,
    sigHeight
  )
  y += sigHeight + 2

  doc.setDrawColor(200)
  doc.line(margin, y, margin + sigColWidth, y)
  doc.line(
    margin + sigColWidth + 10,
    y,
    margin + sigColWidth + 10 + sigColWidth,
    y
  )

  const footerWidth = 110
  const footerHeight = footerWidth / (957 / 281)
  doc.addImage(
    footerLogos,
    "PNG",
    (pageWidth - footerWidth) / 2,
    pageHeight - footerHeight - 15,
    footerWidth,
    footerHeight
  )

  return doc
}

export default function CompletionAgreementPage() {
  const { staffProfile } = useAuth()
  const [services, setServices] = useState<ServiceOption[]>([])
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([])
  const [selectedServiceId, setSelectedServiceId] = useState("")
  const [advisorId, setAdvisorId] = useState("")
  const [agreementDate, setAgreementDate] = useState(todayIso())
  const [clientSignature, setClientSignature] = useState("")
  const [clientSignMode, setClientSignMode] = useState<"now" | "link">("now")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [submitted, setSubmitted] = useState<SubmittedAgreement | null>(null)
  const [linkAgreementId, setLinkAgreementId] = useState<string | null>(null)
  const [signLinkCopied, setSignLinkCopied] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [pdfError, setPdfError] = useState("")

  useEffect(() => {
    supabase
      .from("service_requests")
      .select(
        "id, client_id, created_at, sector, status, assigned_advisor_id, clients(business_name, representative_name)"
      )
      .eq("status", "en_proceso")
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
      .select("id, name, signature, email")
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

  function handleSelectService(label: string) {
    const service = serviceOptionsMap.get(label)
    setSelectedServiceId(service?.id ?? "")
    setAdvisorId(service?.assigned_advisor_id ?? "")
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedService || !advisorId || !selectedAdvisor?.signature) return
    if (clientSignMode === "now" && !clientSignature) return

    const signNow = clientSignMode === "now"

    setSubmitting(true)
    setSubmitError("")

    const { data, error } = await supabase
      .from("completion_agreements")
      .insert({
        service_request_id: selectedService.id,
        advisor_id: advisorId,
        advisor_signature: selectedAdvisor.signature,
        client_signature: signNow ? clientSignature : null,
        agreement_date: agreementDate,
      })
      .select("id")
      .single()

    if (error || !data) {
      setSubmitting(false)
      setSubmitError(
        "No pudimos guardar el acuerdo. Intenta de nuevo en unos minutos."
      )
      return
    }

    if (!signNow) {
      // La firma queda pendiente por enlace — el servicio no pasa a
      // "Completo" hasta que el cliente firme (ver sign_completion_agreement).
      setSubmitting(false)
      setLinkAgreementId(data.id)
      return
    }

    // El acuerdo firmado es lo único que puede marcar un servicio como
    // completo — no hay forma de ponerlo en "Completo" a mano desde
    // Servicios (ver services.tsx).
    await supabase
      .from("service_requests")
      .update({ status: "completo" })
      .eq("id", selectedService.id)

    await supabase.from("service_request_changes").insert({
      service_request_id: selectedService.id,
      business_name: selectedService.business_name,
      action: "editado",
      changed_fields: { status: { from: "en_proceso", to: "completo" } },
      actor: staffProfile?.name ?? "Usuario",
    })

    setSubmitting(false)

    setSubmitted({
      service: selectedService,
      advisorName: selectedAdvisor.name,
      advisorSignature: selectedAdvisor.signature,
      clientSignature,
      agreementDate,
    })
  }

  async function handleCopySignLink() {
    if (!linkAgreementId) return
    const url = `${window.location.origin}/firmar-acuerdo-finalizacion/${linkAgreementId}`
    await navigator.clipboard.writeText(url)
    setSignLinkCopied(true)
    setTimeout(() => setSignLinkCopied(false), 2000)
  }

  function handleNewAgreement() {
    setSubmitted(null)
    setSelectedServiceId("")
    setAdvisorId("")
    setAgreementDate(todayIso())
    setClientSignature("")
    setClientSignMode("now")
    setLinkAgreementId(null)
  }

  async function handleExportPdf() {
    if (!submitted) return

    setGeneratingPdf(true)
    setPdfError("")

    try {
      const doc = await buildAgreementPdf({
        businessName: submitted.service.business_name,
        advisorName: submitted.advisorName,
        advisorSignature: submitted.advisorSignature,
        clientSignature: submitted.clientSignature,
        agreementDate: submitted.agreementDate,
      })
      doc.save(`acuerdo-finalizacion-${submitted.service.business_name}.pdf`)
    } catch {
      setPdfError("No pudimos generar el PDF. Intenta de nuevo.")
    }

    setGeneratingPdf(false)
  }

  if (linkAgreementId) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Acuerdo de Finalización de Proyecto
        </h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-lg bg-success/10 text-success">
              <LinkIcon className="size-5" />
            </div>
            <CardDescription>
              Acuerdo guardado. Envía este enlace al cliente para que revise
              la información y firme. El servicio pasará a "Completo" en
              cuanto firme.
            </CardDescription>
            <Button type="button" variant="outline" onClick={handleCopySignLink}>
              {signLinkCopied ? (
                <>
                  <Check className="size-4" />
                  Enlace copiado
                </>
              ) : (
                <>
                  <LinkIcon className="size-4" />
                  Copiar enlace de firma
                </>
              )}
            </Button>
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

  if (submitted) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            Acuerdo de Finalización de Proyecto
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
                  <td className="w-28 py-2 pr-4 font-medium">Cliente</td>
                  <td className="py-2">{submitted.service.business_name}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4 font-medium">Asesor</td>
                  <td className="py-2">{submitted.advisorName}</td>
                  <td className="py-2 pr-4 pl-6 font-medium">Fecha</td>
                  <td className="py-2">{submitted.agreementDate}</td>
                </tr>
              </tbody>
            </table>

            <div className="flex flex-col gap-1">
              <p className="font-medium">El asesor:</p>
              <p className="text-sm text-muted-foreground">
                Indica que ha completado las actividades acordadas en el
                documento Acuerdo de Acciones de su proyecto, en el tiempo y
                alcance esperado.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <p className="font-medium">El cliente:</p>
              <p className="text-sm text-muted-foreground">
                Se encuentra conforme con los entregables del proyecto
                realizado.
              </p>
              <p className="text-sm text-muted-foreground">
                Se compromete a proveer información necesaria para que el
                Centro de Prototipado y Transferencia Tecnológica pueda
                realizar la Encuesta de Evaluación del Impacto Económico
                generado a través de la asesoría recibida.
              </p>
              <p className="text-sm text-muted-foreground">
                Autoriza al Centro de Prototipado y Transferencia Tecnológica
                a utilizar su testimonio en los soportes publicitarios y/o
                promocionales disponibles en los medios impresos y digitales.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 pt-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">Firma Asesor</p>
                <img
                  src={submitted.advisorSignature}
                  alt="Firma del asesor"
                  className="-mb-3 h-16 self-center object-contain"
                />
                <div className="border-t" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">Firma Cliente</p>
                <img
                  src={submitted.clientSignature}
                  alt="Firma del cliente"
                  className="-mb-3 h-16 self-center object-contain"
                />
                <div className="border-t" />
              </div>
            </div>

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
        Acuerdo de Finalización de Proyecto
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card>
          <CardHeader className="border-b pb-4">
            <CardDescription>
              El asesor indica que completó las actividades acordadas para
              este proyecto, y el cliente confirma su conformidad. Fírmenlo
              juntos en este momento.
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
                emptyMessage="No hay servicios en proceso"
                required
              />
              <p className="text-xs text-muted-foreground">
                Solo se muestran los servicios marcados "En proceso".
              </p>
            </div>

            {selectedService && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="advisor">Asesor</Label>
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

                <div className="flex flex-col gap-2 border-t pt-4">
                  <p className="font-medium">El asesor:</p>
                  <p className="text-sm text-muted-foreground">
                    Indica que ha completado las actividades acordadas en el
                    documento Acuerdo de Acciones de su proyecto, en el
                    tiempo y alcance esperado.
                  </p>
                  <p className="font-medium">El cliente:</p>
                  {CLIENT_STATEMENTS.map((statement) => (
                    <p
                      key={statement}
                      className="text-sm text-muted-foreground"
                    >
                      {statement}
                    </p>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    El cliente debe leer lo anterior antes de firmar.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Firma Cliente</Label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setClientSignMode("now")}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                        clientSignMode === "now"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/70"
                      }`}
                    >
                      Firmar ahora
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientSignMode("link")}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                        clientSignMode === "link"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/70"
                      }`}
                    >
                      Enviar enlace
                    </button>
                  </div>
                  {clientSignMode === "now" ? (
                    <SignatureCanvas
                      value={clientSignature}
                      onChange={setClientSignature}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Al guardar, se genera un enlace para que el cliente lea
                      lo anterior y firme después. El servicio no pasa a
                      "Completo" hasta que firme.
                    </p>
                  )}
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
            (clientSignMode === "now" && !clientSignature)
          }
          className="self-end"
        >
          {submitting ? "Guardando..." : "Guardar acuerdo"}
        </Button>
      </form>
    </div>
  )
}
