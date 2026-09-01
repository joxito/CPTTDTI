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

const CLIENT_STATEMENTS = [
  "Se encuentra conforme con los entregables del proyecto realizado.",
  "Se compromete a proveer información necesaria para que el Centro de Prototipado y Transferencia Tecnológica pueda realizar la Encuesta de Evaluación del Impacto Económico generado a través de la asesoría recibida.",
  "Autoriza al Centro de Prototipado y Transferencia Tecnológica a utilizar su testimonio en los soportes publicitarios y/o promocionales disponibles en los medios impresos y digitales.",
]

type AgreementSummary = {
  id: string
  business_name: string
  representative_name: string
  advisor_name: string
  advisor_signature: string
  agreement_date: string
  client_signature: string | null
}

export default function SignCompletionAgreementPage() {
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
        .rpc("get_completion_agreement_signing_info", { p_agreement_id: id })
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

    const { error } = await supabase.rpc("sign_completion_agreement", {
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

      <div className="mx-auto max-w-md">
        <Card>
          <CardContent className="flex flex-col gap-4 py-8">
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
                  Acuerdo de Finalización de {agreement.business_name} quedó
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
              <div className="flex flex-col gap-4">
                <div className="text-center">
                  <CardTitle>Acuerdo de Finalización de Proyecto</CardTitle>
                  <CardDescription className="mt-1">
                    {agreement.business_name} — {agreement.representative_name}
                  </CardDescription>
                </div>

                <table className="w-full border-collapse border-t text-sm">
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 pr-4 font-medium">Asesor</td>
                      <td className="py-2">{agreement.advisor_name}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-medium">Fecha</td>
                      <td className="py-2">{agreement.agreement_date}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="flex flex-col gap-1">
                  <p className="font-medium">El asesor:</p>
                  <p className="text-sm text-muted-foreground">
                    Indica que ha completado las actividades acordadas en el
                    documento Acuerdo de Acciones de su proyecto, en el
                    tiempo y alcance esperado.
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <p className="font-medium">El cliente:</p>
                  {CLIENT_STATEMENTS.map((statement) => (
                    <p
                      key={statement}
                      className="text-sm text-muted-foreground"
                    >
                      {statement}
                    </p>
                  ))}
                </div>

                <p className="text-sm text-muted-foreground">
                  Lee lo anterior y dibuja tu firma en el recuadro de abajo
                  para confirmar tu conformidad.
                </p>
                <SignatureCanvas value={signature} onChange={setSignature} />
                {saveError && (
                  <p className="text-sm text-destructive">{saveError}</p>
                )}
                <Button
                  type="button"
                  onClick={handleSign}
                  disabled={!signature || saving}
                >
                  {saving ? "Guardando..." : "Firmar y guardar"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
