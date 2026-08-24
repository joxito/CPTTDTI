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

type RequestSummary = {
  id: string
  signature: string | null
  clients: {
    business_name: string
    representative_name: string
  }
}

export default function SignRequestPage() {
  const { id } = useParams<{ id: string }>()
  const [request, setRequest] = useState<RequestSummary | null>(null)
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
        .rpc("get_signing_info", { p_request_id: id })
        .single()

      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const signingInfo = data as {
        id: string
        signature: string | null
        business_name: string
        representative_name: string
      }

      setRequest({
        id: signingInfo.id,
        signature: signingInfo.signature,
        clients: {
          business_name: signingInfo.business_name,
          representative_name: signingInfo.representative_name,
        },
      })
      setLoading(false)
    }

    load()
  }, [id])

  async function handleSign() {
    if (!request || !signature) return

    setSaving(true)
    setSaveError("")

    const { error } = await supabase.rpc("sign_service_request", {
      p_request_id: request.id,
      p_signature: signature,
    })

    setSaving(false)

    if (error) {
      setSaveError("No pudimos guardar la firma. Intentá de nuevo.")
      return
    }

    setJustSigned(true)
  }

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
                <CardTitle>Solicitud no encontrada</CardTitle>
                <CardDescription>
                  El enlace puede ser inválido o la solicitud fue eliminada.
                </CardDescription>
              </div>
            )}

            {!loading && request && (justSigned || request.signature) && (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex size-10 items-center justify-center rounded-lg bg-success/10 text-success">
                  <CheckCircle2 className="size-5" />
                </div>
                <CardTitle>Documento firmado</CardTitle>
                <CardDescription>
                  Gracias, {request.clients.representative_name}. Tu firma
                  para {request.clients.business_name} quedó registrada.
                </CardDescription>
                <img
                  src={justSigned ? signature : request.signature ?? ""}
                  alt="Firma"
                  className="mt-2 h-40 rounded-lg border bg-white p-2"
                />
              </div>
            )}

            {!loading && request && !justSigned && !request.signature && (
              <div className="flex flex-col gap-4">
                <div className="text-center">
                  <CardTitle>Firmar solicitud</CardTitle>
                  <CardDescription className="mt-1">
                    {request.clients.business_name} —{" "}
                    {request.clients.representative_name}
                  </CardDescription>
                </div>
                <p className="text-sm text-muted-foreground">
                  Dibujá tu firma en el recuadro de abajo para confirmar tu
                  solicitud de servicios al CPTTL.
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
