import * as React from "react"
import { Camera, X } from "lucide-react"

import { Button } from "@/components/ui/button"

type CameraCaptureProps = {
  open: boolean
  onClose: () => void
  onCapture: (file: File) => void
  title?: string
}

export function CameraCapture({
  open,
  onClose,
  onCapture,
  title = "Tomar foto",
}: CameraCaptureProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    if (!open) return

    setError("")

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        })
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch {
        setError(
          "No pudimos acceder a la cámara. Revisa que le hayas dado permiso al navegador."
        )
      }
    }

    startCamera()

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [open])

  function handleCapture() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return

    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext("2d")
    if (!context) return

    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `captura-${Date.now()}.jpg`, {
          type: "image/jpeg",
        })
        onCapture(file)
      },
      "image/jpeg",
      0.9
    )
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-md flex-col gap-3 rounded-xl bg-background p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1 text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {error ? (
          <p className="py-8 text-center text-sm text-destructive">{error}</p>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="aspect-video w-full rounded-lg bg-black object-cover"
          />
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {!error && (
            <Button type="button" onClick={handleCapture}>
              <Camera className="size-4" />
              Capturar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
