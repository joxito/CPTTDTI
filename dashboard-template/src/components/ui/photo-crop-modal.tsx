import * as React from "react"

import { Button } from "@/components/ui/button"

const VIEWPORT = 280
const OUTPUT = 320
const MAX_ZOOM = 3

type PhotoCropModalProps = {
  file: File
  onCancel: () => void
  onSelect: (dataUrl: string) => void
}

export function PhotoCropModal({ file, onCancel, onSelect }: PhotoCropModalProps) {
  const [imageUrl, setImageUrl] = React.useState<string | null>(null)
  const [naturalSize, setNaturalSize] = React.useState<{ w: number; h: number } | null>(
    null
  )
  const [zoom, setZoom] = React.useState(1)
  const [offset, setOffset] = React.useState({ x: 0, y: 0 })
  const dragRef = React.useRef<{
    startX: number
    startY: number
    startOffset: { x: number; y: number }
  } | null>(null)

  React.useEffect(() => {
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  React.useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  function baseScale(w: number, h: number) {
    return Math.max(VIEWPORT / w, VIEWPORT / h)
  }

  function clampOffset(
    next: { x: number; y: number },
    scale: number,
    w: number,
    h: number
  ) {
    const displayedW = w * scale
    const displayedH = h * scale
    return {
      x: Math.min(0, Math.max(VIEWPORT - displayedW, next.x)),
      y: Math.min(0, Math.max(VIEWPORT - displayedH, next.y)),
    }
  }

  function handleImageLoad(event: React.SyntheticEvent<HTMLImageElement>) {
    const w = event.currentTarget.naturalWidth
    const h = event.currentTarget.naturalHeight
    setNaturalSize({ w, h })
    const scale = baseScale(w, h)
    setOffset(
      clampOffset(
        { x: (VIEWPORT - w * scale) / 2, y: (VIEWPORT - h * scale) / 2 },
        scale,
        w,
        h
      )
    )
  }

  function handleZoomChange(nextZoom: number) {
    if (!naturalSize) return
    setZoom(nextZoom)
    const scale = baseScale(naturalSize.w, naturalSize.h) * nextZoom
    setOffset((current) => clampOffset(current, scale, naturalSize.w, naturalSize.h))
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { startX: event.clientX, startY: event.clientY, startOffset: offset }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current || !naturalSize) return
    const dx = event.clientX - dragRef.current.startX
    const dy = event.clientY - dragRef.current.startY
    const scale = baseScale(naturalSize.w, naturalSize.h) * zoom
    setOffset(
      clampOffset(
        {
          x: dragRef.current.startOffset.x + dx,
          y: dragRef.current.startOffset.y + dy,
        },
        scale,
        naturalSize.w,
        naturalSize.h
      )
    )
  }

  function handlePointerUp() {
    dragRef.current = null
  }

  function handleSelect() {
    if (!imageUrl || !naturalSize) return

    const scale = baseScale(naturalSize.w, naturalSize.h) * zoom
    const sourceX = -offset.x / scale
    const sourceY = -offset.y / scale
    const sourceSize = VIEWPORT / scale

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = OUTPUT
      canvas.height = OUTPUT
      const ctx = canvas.getContext("2d")
      ctx?.drawImage(
        img,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        OUTPUT,
        OUTPUT
      )
      onSelect(canvas.toDataURL("image/jpeg", 0.9))
    }
    img.src = imageUrl
  }

  const scale = naturalSize ? baseScale(naturalSize.w, naturalSize.h) * zoom : 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-lg border bg-background p-6 shadow-lg">
        <h2 className="text-base font-semibold">Ajustar foto</h2>

        <div
          className="relative mx-auto overflow-hidden rounded-full border bg-muted touch-none select-none"
          style={{ width: VIEWPORT, height: VIEWPORT, cursor: "grab" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Vista previa"
              draggable={false}
              onLoad={handleImageLoad}
              style={
                naturalSize
                  ? {
                      position: "absolute",
                      left: offset.x,
                      top: offset.y,
                      width: naturalSize.w * scale,
                      height: naturalSize.h * scale,
                      maxWidth: "none",
                    }
                  : { display: "none" }
              }
            />
          )}
        </div>

        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(event) => handleZoomChange(Number(event.target.value))}
          aria-label="Zoom"
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSelect} disabled={!naturalSize}>
            Seleccionar
          </Button>
        </div>
      </div>
    </div>
  )
}
