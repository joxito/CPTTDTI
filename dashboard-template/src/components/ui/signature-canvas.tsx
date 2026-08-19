import * as React from "react"
import { Eraser, PenTool } from "lucide-react"

import { cn } from "@/lib/utils"

type SignatureCanvasProps = {
  value: string
  onChange: (signature: string) => void
  className?: string
}

function getCoordinates(
  event: React.MouseEvent | React.TouchEvent,
  canvas: HTMLCanvasElement
) {
  const point = "touches" in event ? event.touches[0] : event
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height

  return {
    x: (point.clientX - rect.left) * scaleX,
    y: (point.clientY - rect.top) * scaleY,
  }
}

export function SignatureCanvas({
  value,
  onChange,
  className,
}: SignatureCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const isDrawingRef = React.useRef(false)
  const [hasSignature, setHasSignature] = React.useState(Boolean(value))

  React.useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (value) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        setHasSignature(true)
      }
      img.src = value
    } else {
      setHasSignature(false)
    }
  }, [value])

  function startDrawing(event: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    isDrawingRef.current = true
    const { x, y } = getCoordinates(event, canvas)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.strokeStyle = "#000"
  }

  function draw(event: React.MouseEvent | React.TouchEvent) {
    if (!isDrawingRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const { x, y } = getCoordinates(event, canvas)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasSignature(true)
  }

  function stopDrawing() {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    const canvas = canvasRef.current
    if (canvas) onChange(canvas.toDataURL())
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    onChange("")
  }

  return (
    <div
      className={cn(
        "group relative flex flex-col items-center justify-center rounded-lg border border-dashed border-input bg-muted/30",
        className
      )}
    >
      <canvas
        ref={canvasRef}
        width={500}
        height={200}
        className="h-24 w-full cursor-crosshair touch-none"
        style={{ touchAction: "none" }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />

      {!hasSignature && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground">
          <PenTool className="size-5" />
          <p className="text-xs">Dibujá tu firma aquí</p>
        </div>
      )}

      {hasSignature && (
        <button
          type="button"
          onClick={clearCanvas}
          aria-label="Borrar firma"
          className="absolute top-2 right-2 rounded-full bg-background p-1.5 text-muted-foreground shadow-xs hover:bg-destructive/10 hover:text-destructive"
        >
          <Eraser className="size-3.5" />
        </button>
      )}
    </div>
  )
}
