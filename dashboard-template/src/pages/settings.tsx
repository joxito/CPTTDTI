import { useRef, useState } from "react"
import { Pencil } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PhotoCropModal } from "@/components/ui/photo-crop-modal"
import { SignatureCanvas } from "@/components/ui/signature-canvas"
import { useAuth } from "@/hooks/use-auth"
import { initialsFromName } from "@/lib/format"
import { supabase } from "@/lib/supabase"

export default function SettingsPage() {
  const { session, staffProfile, refreshStaffProfile } = useAuth()
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [editingProfile, setEditingProfile] = useState(false)
  const [name, setName] = useState(staffProfile?.name ?? "")
  const [photo, setPhoto] = useState(staffProfile?.photo ?? null)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState("")
  const [profileError, setProfileError] = useState("")

  const [signature, setSignature] = useState(staffProfile?.signature ?? "")
  const [savingSignature, setSavingSignature] = useState(false)
  const [signatureMessage, setSignatureMessage] = useState("")
  const [signatureError, setSignatureError] = useState("")

  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState("")
  const [passwordError, setPasswordError] = useState("")

  function startEditingProfile() {
    setName(staffProfile?.name ?? "")
    setPhoto(staffProfile?.photo ?? null)
    setProfileError("")
    setProfileMessage("")
    setEditingProfile(true)
  }

  function cancelEditingProfile() {
    setEditingProfile(false)
    setProfileError("")
  }

  function handlePhotoPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) setCropFile(file)
    event.target.value = ""
  }

  async function handleSaveProfile() {
    if (!session || !name.trim()) return

    setSavingProfile(true)
    setProfileError("")
    setProfileMessage("")

    const { error } = await supabase
      .from("staff")
      .update({ name: name.trim(), photo })
      .eq("id", session.user.id)

    setSavingProfile(false)

    if (error) {
      setProfileError("No pudimos guardar los cambios.")
      return
    }

    await refreshStaffProfile()
    setEditingProfile(false)
    setProfileMessage("Perfil actualizado.")
    setTimeout(() => setProfileMessage(""), 2000)
  }

  async function handleSaveSignature() {
    if (!session) return

    setSavingSignature(true)
    setSignatureError("")
    setSignatureMessage("")

    const { error } = await supabase
      .from("staff")
      .update({ signature: signature || null })
      .eq("id", session.user.id)

    setSavingSignature(false)

    if (error) {
      setSignatureError("No pudimos guardar la firma.")
      return
    }

    await refreshStaffProfile()
    setSignatureMessage("Firma actualizada.")
    setTimeout(() => setSignatureMessage(""), 2000)
  }

  async function handleChangePassword() {
    setPasswordError("")
    setPasswordMessage("")

    if (!session?.user.email) return

    if (newPassword.length < 8) {
      setPasswordError("La contraseña debe tener al menos 8 caracteres.")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden.")
      return
    }

    setSavingPassword(true)

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: oldPassword,
    })

    if (reauthError) {
      setSavingPassword(false)
      setPasswordError("La contraseña anterior no es correcta.")
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)

    if (error) {
      setPasswordError("No pudimos cambiar la contraseña. Intenta de nuevo.")
      return
    }

    setOldPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setPasswordMessage("Contraseña actualizada.")
    setTimeout(() => setPasswordMessage(""), 2000)
  }

  const displayedPhoto = editingProfile ? photo : staffProfile?.photo
  const displayedName = editingProfile ? name : staffProfile?.name

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <CardTitle>Perfil</CardTitle>
          {!editingProfile && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Editar perfil"
              onClick={startEditingProfile}
            >
              <Pencil className="size-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-6">
          <div className="flex items-center gap-4">
            <Avatar
              className={editingProfile ? "size-16 cursor-pointer" : "size-16"}
              onClick={
                editingProfile ? () => photoInputRef.current?.click() : undefined
              }
            >
              {displayedPhoto && <AvatarImage src={displayedPhoto} />}
              <AvatarFallback className="text-base">
                {initialsFromName(displayedName)}
              </AvatarFallback>
            </Avatar>
            {!editingProfile && (
              <span className="text-sm font-medium">{displayedName}</span>
            )}
            {editingProfile && (
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handlePhotoPick}
              />
            )}
          </div>

          {editingProfile && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-name">Nombre</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
          )}

          {profileError && (
            <p className="text-sm text-destructive">{profileError}</p>
          )}
          {profileMessage && (
            <p className="text-sm text-success">{profileMessage}</p>
          )}

          {editingProfile && (
            <div className="flex gap-2">
              <Button
                onClick={handleSaveProfile}
                disabled={savingProfile || !name.trim()}
              >
                {savingProfile ? "Guardando..." : "Guardar cambios"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={cancelEditingProfile}
                disabled={savingProfile}
              >
                Cancelar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Firma</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-6">
          <p className="text-sm text-muted-foreground">
            Se usa para completar el Acuerdo de Finalización de Proyecto
            cuando te asignan como asesor encargado.
          </p>
          <SignatureCanvas
            value={signature}
            onChange={setSignature}
            className="max-w-md"
          />

          {signatureError && (
            <p className="text-sm text-destructive">{signatureError}</p>
          )}
          {signatureMessage && (
            <p className="text-sm text-success">{signatureMessage}</p>
          )}

          <Button
            onClick={handleSaveSignature}
            disabled={savingSignature}
            className="self-start"
          >
            {savingSignature ? "Guardando..." : "Guardar firma"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cambiar contraseña</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="old-password">Contraseña anterior</Label>
            <Input
              id="old-password"
              type="password"
              value={oldPassword}
              onChange={(event) => setOldPassword(event.target.value)}
              autoComplete="current-password"
            />
          </div>

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
            disabled={
              savingPassword || !oldPassword || !newPassword || !confirmPassword
            }
            className="self-start"
          >
            {savingPassword ? "Guardando..." : "Cambiar contraseña"}
          </Button>
        </CardContent>
      </Card>

      {cropFile && (
        <PhotoCropModal
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onSelect={(dataUrl) => {
            setPhoto(dataUrl)
            setCropFile(null)
          }}
        />
      )}
    </div>
  )
}
