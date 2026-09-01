import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { AlertCircle, CheckCircle2 } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SignatureCanvas } from "@/components/ui/signature-canvas"
import { supabase } from "@/lib/supabase"

const CONSIDERATIONS_TEXT =
  "Consideraciones del servicio: Cada proyecto podrá contemplar un máximo de dos (2) modificaciones o ajustes, de acuerdo con el alcance previamente establecido. Asimismo, cada cliente podrá recibir hasta dos (2) asistencias técnicas durante el mismo año, conforme a los criterios y lineamientos establecidos por el Centro."

const IMPACT_INTRO_TEXT =
  "Con la ayuda del Centro de Prototipado y Transferencia Tecnológica, se esperan lograr los siguientes resultados:"

const IMPACT_BODY_TEXT =
  "Luego de agotar un proceso de investigación, análisis y desarrollo del producto o servicio se busca hacer las mejoras de lugar, para ofrecer un producto único que pueda brindar un valor agregado al beneficiario final, y que cumpla con los requerimientos nacionales e internacionales."

type RawActivity = {
  description: string
  start_date: string
  end_date: string
  responsible: string
}

type AgreementSummary = {
  id: string
  business_name: string
  representative_name: string
  project_name: string
  service_type: string
  service_quantity: string | null
  estimated_completion_time: string | null
  identified_need: string
  service_scope: string
  proposed_solution: string
  agreements: string
  activities: RawActivity[]
  advisor_name: string
  advisor_signature: string
  coordinator_name: string
  coordinator_signature: string
  agreement_date: string
  client_signature: string | null
}

export default function SignActionAgreementPage() {
  const { id } = useParams<{ id: string }>()
  const [agreement, setAgreement] = useState<AgreementSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [signature, setSignature] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [justSigned, setJustSigned] = useState(false)

  useEffect(() => {
    async function load() {
      if (!id) return
      const { data, error } = await supabase
        .rpc("get_action_agreement_signing_info", { p_agreement_id: id })
        .single()

      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const info = data as Omit<AgreementSummary, "id">
      setAgreement({ id, ...info })
      setLoading(false)
    }

    load()
  }, [id])

  async function handleSign() {
    if (!agreement || !signature) return

    setSaving(true)
    setSaveError("")

    const { error } = await supabase.rpc("sign_action_agreement", {
      p_agreement_id: agreement.id,
      p_signature: signature,
    })

    setSaving(false)

    if (error) {
      setSaveError("No pudimos guardar la firma. Intenta de nuevo.")
      return
    }

    setJustSigned(true)
  }

  const alreadySigned = Boolean(agreement?.client_signature)

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8 md:px-6">
      <div className="mx-auto mb-8 flex max-w-md items-center justify-center">
        <img
          src="/cptt-logo.png"
          alt="CPTTL"
          className="h-auto w-[min(90vw,373px)]"
        />
      </div>

      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="flex flex-col gap-6 py-8">
            {loading && (
              <p className="text-center text-sm text-muted-foreground">
                Cargando...
              </p>
            )}

            {!loading && notFound && (
              <div className="flex flex-col items-center gap-3 text-center">
                <AlertCircle className="size-8 text-muted-foreground" />
                <CardTitle>Acuerdo no encontrado</CardTitle>
                <CardDescription>
                  El enlace puede ser inválido o el acuerdo fue eliminado.
                </CardDescription>
              </div>
            )}

            {!loading && agreement && (justSigned || alreadySigned) && (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex size-10 items-center justify-center rounded-lg bg-success/10 text-success">
                  <CheckCircle2 className="size-5" />
                </div>
                <CardTitle>Documento firmado</CardTitle>
                <CardDescription>
                  Gracias, {agreement.representative_name}. Tu firma para el
                  Acuerdo de Acciones de {agreement.business_name} quedó
                  registrada.
                </CardDescription>
                <img
                  src={justSigned ? signature : agreement.client_signature ?? ""}
                  alt="Firma"
                  className="mt-2 h-40 rounded-lg border bg-white p-2"
                />
              </div>
            )}

            {!loading && agreement && !justSigned && !alreadySigned && (
              <>
                <div className="text-center">
                  <CardTitle>Acuerdo de Acciones del Proyecto</CardTitle>
                  <CardDescription className="mt-1">
                    Revisa la información antes de firmar.
                  </CardDescription>
                </div>

                <div className="grid grid-cols-1 gap-3 border-t pt-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Nombre del Cliente
                    </p>
                    <p>{agreement.business_name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Contacto
                    </p>
                    <p>{agreement.representative_name}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Nombre Proyecto
                    </p>
                    <p>{agreement.project_name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Tipo de servicio
                    </p>
                    <p>{agreement.service_type}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Cantidad
                    </p>
                    <p>{agreement.service_quantity || "—"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Tiempo Estimado de Finalización
                    </p>
                    <p>{agreement.estimated_completion_time || "—"}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <p className="font-medium">Temas Tratados en Reunión</p>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Necesidad identificada
                    </p>
                    <p className="text-sm">{agreement.identified_need}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Alcance del servicio
                    </p>
                    <p className="text-sm">{agreement.service_scope}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Propuesta o solución planteada
                    </p>
                    <p className="text-sm">{agreement.proposed_solution}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Acuerdos
                    </p>
                    <p className="text-sm">{agreement.agreements}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {CONSIDERATIONS_TEXT}
                  </p>
                </div>

                <div className="flex flex-col gap-3 border-t pt-4">
                  <p className="font-medium">Plan de Acción</p>
                  {agreement.activities.map((activity, index) => (
                    <div key={index} className="rounded-lg border p-3 text-sm">
                      <p className="font-medium">
                        Actividad #{index + 1}: {activity.description}
                      </p>
                      <div className="mt-1 grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-3 sm:gap-2">
                        <span>Inicio: {activity.start_date || "—"}</span>
                        <span>Fin estimado: {activity.end_date || "—"}</span>
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

                <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">Asesor(a)</p>
                    <p className="text-xs text-muted-foreground">
                      {agreement.advisor_name}
                    </p>
                    <img
                      src={agreement.advisor_signature}
                      alt="Firma del asesor"
                      className="-mb-3 h-14 self-center object-contain"
                    />
                    <div className="border-t" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">Coordinador(a)</p>
                    <p className="text-xs text-muted-foreground">
                      {agreement.coordinator_name}
                    </p>
                    <img
                      src={agreement.coordinator_signature}
                      alt="Firma del coordinador"
                      className="-mb-3 h-14 self-center object-contain"
                    />
                    <div className="border-t" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Fecha: {agreement.agreement_date}
                </p>

                <div className="flex flex-col gap-2 border-t pt-4">
                  <p className="font-medium">Firma Cliente</p>
                  <p className="text-sm text-muted-foreground">
                    Dibuja tu firma en el recuadro de abajo para confirmar el
                    Acuerdo de Acciones del Proyecto con el CPTTL.
                  </p>
                  <SignatureCanvas value={signature} onChange={setSignature} />
                  {saveError && (
                    <p className="text-sm text-destructive">{saveError}</p>
                  )}
                  <Button
                    type="button"
                    onClick={handleSign}
                    disabled={!signature || saving}
                    className="self-end"
                  >
                    {saving ? "Guardando..." : "Firmar y guardar"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
