const MAX_PHOTO_SIZE = 256

export function resizePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const scale = Math.min(1, MAX_PHOTO_SIZE / Math.max(img.width, img.height))
        const canvas = document.createElement("canvas")
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        const ctx = canvas.getContext("2d")
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL("image/jpeg", 0.85))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
