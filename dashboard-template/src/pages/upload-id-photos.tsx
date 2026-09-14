import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { AlertCircle, Camera, CheckCircle2, Upload, X } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { CameraCapture } from "@/components/ui/camera-capture"
import { supabase } from "@/lib/supabase"

type ClientInfo = {
  business_name: string
  representative_name: string
  has_id_photos: boolean
}

export default function UploadIdPhotosPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const [client, setClient] = useState<ClientInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [idPhotos, setIdPhotos] = useState<File[]>([])
  const [idPhotosError, setIdPhotosError] = useState("")
  const [hasCamera, setHasCamera] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const idPhotosInputRef = useRef<HTMLInputElement>(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    async function load() {
      if (!clientId) return
      const { data, error } = await supabase
        .rpc("get_client_id_photo_upload_info", { p_client_id: clientId })
        .single()

      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setClient(data as ClientInfo)
      setLoading(false)
    }

    load()
  }, [clientId])

  useEffect(() => {
    const input = idPhotosInputRef.current
    if (!input) return
    const dataTransfer = new DataTransfer()
    idPhotos.forEach((file) => dataTransfer.items.add(file))
    input.files = dataTransfer.files

    // Se exigen ambas caras de la cédula, salvo que se suba un solo PDF
    // (se asume que trae las dos páginas). El input file nativo solo sabe
    // validar "vacío o no", así que la regla de cantidad se aplica con
    // setCustomValidity.
    const isSinglePdf =
      idPhotos.length === 1 && idPhotos[0].type === "application/pdf"
    const isValid = idPhotos.length >= 2 || isSinglePdf
    input.setCustomValidity(
      isValid
        ? ""
        : "Sube el frente y el dorso de la cédula, o un PDF con ambas caras."
    )
  }, [idPhotos])

  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) =>
        setHasCamera(devices.some((device) => device.kind === "videoinput"))
      )
      .catch(() => setHasCamera(false))
  }, [])

  function addIdPhotos(files: File[]) {
    if (files.length === 0) return

    const combined = [...idPhotos, ...files]

    if (combined.length > 2) {
      setIdPhotosError("Solo puedes subir un máximo de 2 fotos.")
      setIdPhotos(combined.slice(0, 2))
    } else {
      setIdPhotosError("")
      setIdPhotos(combined)
    }
  }

  function removeIdPhoto(index: number) {
    setIdPhotosError("")
    setIdPhotos((current) => current.filter((_, i) => i !== index))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!clientId || idPhotos.length === 0) return

    setSubmitting(true)
    setSubmitError("")

    const paths: string[] = []
    for (const file of idPhotos) {
      const extension = file.name.split(".").pop() || "jpg"
      const path = `${clientId}/${crypto.randomUUID()}.${extension}`
      const { error } = await supabase.storage
        .from("cedulas")
        .upload(path, file, { contentType: file.type })
      if (!error) paths.push(path)
    }

    if (paths.length === 0) {
      setSubmitting(false)
      setSubmitError("No pudimos subir el documento. Intenta de nuevo.")
      return
    }

    const { error } = await supabase.rpc("set_client_id_photos", {
      p_client_id: clientId,
      p_paths: paths,
    })

    setSubmitting(false)

    if (error) {
      setSubmitError("No pudimos guardar el documento. Intenta de nuevo.")
      return
    }

    setSubmitted(true)
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
          <CardContent className="flex flex-col gap-6 py-8">
            {loading && (
              <p className="text-center text-sm text-muted-foreground">
                Cargando...
              </p>
            )}

            {!loading && notFound && (
              <div className="flex flex-col items-center gap-3 text-center">
                <AlertCircle className="size-8 text-muted-foreground" />
                <CardTitle>Enlace no válido</CardTitle>
                <CardDescription>
                  El enlace puede ser inválido o el cliente ya no existe.
                </CardDescription>
              </div>
            )}

            {!loading && client && submitted && (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex size-10 items-center justify-center rounded-lg bg-success/10 text-success">
                  <CheckCircle2 className="size-5" />
                </div>
                <CardTitle>Documento recibido</CardTitle>
                <CardDescription>
                  Gracias, {client.representative_name}. Tu cédula quedó
                  registrada para {client.business_name}.
                </CardDescription>
              </div>
            )}

            {!loading && client && !submitted && (
              <form
                onSubmit={handleSubmit}
                className="flex flex-col items-center gap-4"
              >
                <div className="text-center">
                  <CardTitle>Sube tu cédula</CardTitle>
                  <CardDescription className="mt-1">
                    {client.business_name}
                  </CardDescription>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  Se necesitan el frente y el dorso (dos fotos), o un solo PDF
                  con ambas caras.
                </p>

                <div className="flex flex-wrap justify-center gap-2">
                  <label
                    htmlFor="idPhotosUpload"
                    className={buttonVariants({ variant: "outline" })}
                  >
                    <Upload className="size-4" />
                    Subir documento
                  </label>
                  {hasCamera && idPhotos.length < 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCameraOpen(true)}
                    >
                      <Camera className="size-4" />
                      Usar cámara
                    </Button>
                  )}
                </div>

                <input
                  id="idPhotosUpload"
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  className="sr-only"
                  onChange={(event) => {
                    addIdPhotos(Array.from(event.target.files ?? []))
                    event.target.value = ""
                  }}
                />

                <CameraCapture
                  open={cameraOpen}
                  onClose={() => setCameraOpen(false)}
                  title={
                    idPhotos.length === 0
                      ? "Foto de la cédula — parte frontal"
                      : "Foto de la cédula — parte trasera"
                  }
                  onCapture={(file) => {
                    const willReachTwo = idPhotos.length + 1 >= 2
                    addIdPhotos([file])
                    if (willReachTwo) setCameraOpen(false)
                  }}
                />

                {/* Control real (oculto) que participa de la validación del formulario. */}
                <input
                  ref={idPhotosInputRef}
                  type="file"
                  required
                  tabIndex={-1}
                  onChange={() => {}}
                  className="sr-only"
                />

                {idPhotos.length > 0 && (
                  <ul className="flex w-full flex-col gap-1.5">
                    {idPhotos.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm"
                      >
                        <span className="truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeIdPhoto(index)}
                          aria-label={`Quitar ${file.name}`}
                          className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <X className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {idPhotosError && (
                  <p className="text-xs text-destructive">{idPhotosError}</p>
                )}
                {submitError && (
                  <p className="text-xs text-destructive">{submitError}</p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting || idPhotos.length === 0}
                >
                  {submitting ? "Enviando..." : "Enviar"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
