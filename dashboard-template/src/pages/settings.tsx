import { useRef, useState } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { initialsFromName } from "@/lib/format"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

const MAX_PHOTO_SIZE = 256

function resizePhoto(file: File): Promise<string> {
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

export default function SettingsPage() {
  const { session, staffProfile, refreshStaffProfile } = useAuth()
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(staffProfile?.name ?? "")
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState("")
  const [profileError, setProfileError] = useState("")

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState("")
  const [passwordError, setPasswordError] = useState("")

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !session) return

    const photo = await resizePhoto(file)
    setProfileError("")

    const { error } = await supabase
      .from("staff")
      .update({ photo })
      .eq("id", session.user.id)

    if (error) {
      setProfileError("No pudimos guardar la foto.")
      return
    }

    await refreshStaffProfile()
    setProfileMessage("Foto actualizada.")
    setTimeout(() => setProfileMessage(""), 2000)
  }

  async function handleSaveName() {
    if (!session || !name.trim()) return

    setSavingProfile(true)
    setProfileError("")
    setProfileMessage("")

    const { error } = await supabase
      .from("staff")
      .update({ name: name.trim() })
      .eq("id", session.user.id)

    setSavingProfile(false)

    if (error) {
      setProfileError("No pudimos guardar el nombre.")
      return
    }

    await refreshStaffProfile()
    setProfileMessage("Nombre actualizado.")
    setTimeout(() => setProfileMessage(""), 2000)
  }

  async function handleChangePassword() {
    setPasswordError("")
    setPasswordMessage("")

    if (newPassword.length < 8) {
      setPasswordError("La contraseña debe tener al menos 8 caracteres.")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden.")
      return
    }

    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)

    if (error) {
      setPasswordError("No pudimos cambiar la contraseña. Intentá de nuevo.")
      return
    }

    setNewPassword("")
    setConfirmPassword("")
    setPasswordMessage("Contraseña actualizada.")
    setTimeout(() => setPasswordMessage(""), 2000)
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Ajustá tu perfil y tu contraseña.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Tu nombre y foto, visibles para el resto del equipo.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              {staffProfile?.photo && <AvatarImage src={staffProfile.photo} />}
              <AvatarFallback className="text-base">
                {initialsFromName(staffProfile?.name)}
              </AvatarFallback>
            </Avatar>
            <label
              htmlFor="profile-photo"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Cambiar foto
            </label>
            <input
              ref={photoInputRef}
              id="profile-photo"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handlePhotoChange}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-name">Nombre</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          {profileError && (
            <p className="text-sm text-destructive">{profileError}</p>
          )}
          {profileMessage && (
            <p className="text-sm text-success">{profileMessage}</p>
          )}

          <Button
            onClick={handleSaveName}
            disabled={savingProfile || !name.trim()}
            className="self-start"
          >
            {savingProfile ? "Guardando..." : "Guardar"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cambiar contraseña</CardTitle>
          <CardDescription>Correo: {session?.user.email}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-password">Nueva contraseña</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-password">Confirmar contraseña</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
            />
          </div>

          {passwordError && (
            <p className="text-sm text-destructive">{passwordError}</p>
          )}
          {passwordMessage && (
            <p className="text-sm text-success">{passwordMessage}</p>
          )}

          <Button
            onClick={handleChangePassword}
            disabled={savingPassword || !newPassword || !confirmPassword}
            className="self-start"
          >
            {savingPassword ? "Guardando..." : "Cambiar contraseña"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
