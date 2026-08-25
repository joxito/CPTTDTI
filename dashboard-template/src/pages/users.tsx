import { useEffect, useState } from "react"
import { Copy, Plus, RefreshCw, Trash2, UserCog } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Sheet } from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CREATOR_EMAIL, useAuth } from "@/hooks/use-auth"
import { initialsFromName } from "@/lib/format"
import { resizePhoto } from "@/lib/image"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

type Role = "administrador" | "editor"

type StaffRow = {
  id: string
  name: string
  role: Role
  photo: string | null
  email?: string
}

async function extractFunctionErrorMessage(error: unknown) {
  const context = (error as { context?: Response })?.context
  if (!context) return null

  try {
    const body = await context.clone().json()
    return typeof body?.error === "string" ? body.error : null
  } catch {
    return null
  }
}

function generatePassword() {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%"
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("")
}

export default function UsersPage() {
  const { isCreator, staffProfile } = useAuth()
  const isAdmin = staffProfile?.role === "administrador"
  const [staff, setStaff] = useState<StaffRow[] | null>(null)
  const [error, setError] = useState("")

  const [addOpen, setAddOpen] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [newName, setNewName] = useState("")
  const [newRole, setNewRole] = useState<Role>("editor")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordCopied, setPasswordCopied] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [editingUser, setEditingUser] = useState<StaffRow | null>(null)
  const [editName, setEditName] = useState("")
  const [editRole, setEditRole] = useState<Role>("editor")
  const [editPhoto, setEditPhoto] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState("")
  const [editMessage, setEditMessage] = useState("")

  const [resetPassword, setResetPassword] = useState("")
  const [resetConfirmPassword, setResetConfirmPassword] = useState("")
  const [resetPasswordCopied, setResetPasswordCopied] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [resetError, setResetError] = useState("")
  const [resetMessage, setResetMessage] = useState("")

  async function loadStaff() {
    setError("")
    const { data, error: loadError } = await supabase
      .from("staff")
      .select("id, name, role, photo, email")
      .order("created_at", { ascending: true })

    if (loadError) {
      setError("No pudimos cargar los usuarios.")
      return
    }

    setStaff(data)
  }

  useEffect(() => {
    loadStaff()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreator])

  function openAddSheet() {
    const password = generatePassword()
    setNewEmail("")
    setNewName("")
    setNewRole("editor")
    setNewPassword(password)
    setConfirmPassword(password)
    setCreateError("")
    setAddOpen(true)
  }

  function handleGeneratePassword() {
    const password = generatePassword()
    setNewPassword(password)
    setConfirmPassword(password)
  }

  async function handleCopyPassword() {
    await navigator.clipboard.writeText(newPassword)
    setPasswordCopied(true)
    setTimeout(() => setPasswordCopied(false), 2000)
  }

  async function handleCreateUser() {
    if (!newEmail || !newName || !newPassword) return

    if (newPassword !== confirmPassword) {
      setCreateError("Las contraseñas no coinciden.")
      return
    }

    setCreating(true)
    setCreateError("")

    const { error: fnError } = await supabase.functions.invoke("create-user", {
      body: { email: newEmail, name: newName, role: newRole, password: newPassword },
    })

    setCreating(false)

    if (fnError) {
      const detail = await extractFunctionErrorMessage(fnError)
      setCreateError(
        `No pudimos crear el usuario "${newEmail}". ${detail ?? "Revisa que el correo no esté ya registrado."}`
      )
      return
    }

    setAddOpen(false)
    loadStaff()
  }

  function openEditSheet(row: StaffRow) {
    setEditingUser(row)
    setEditName(row.name)
    setEditRole(row.role)
    setEditPhoto(row.photo)
    setEditError("")
    setEditMessage("")
    setResetPassword(generatePassword())
    setResetConfirmPassword("")
    setResetError("")
    setResetMessage("")
  }

  function closeEditSheet() {
    setEditingUser(null)
  }

  async function handleEditPhotoChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]
    if (!file) return
    const photo = await resizePhoto(file)
    setEditPhoto(photo)
  }

  async function handleSaveEdit() {
    if (!editingUser || !editName.trim()) return

    setSavingEdit(true)
    setEditError("")
    setEditMessage("")

    const { error: updateError } = await supabase
      .from("staff")
      .update({ name: editName.trim(), role: editRole, photo: editPhoto })
      .eq("id", editingUser.id)

    setSavingEdit(false)

    if (updateError) {
      setEditError("No pudimos guardar los cambios.")
      return
    }

    setStaff((current) =>
      current?.map((row) =>
        row.id === editingUser.id
          ? { ...row, name: editName.trim(), role: editRole, photo: editPhoto }
          : row
      ) ?? current
    )
    setEditMessage("Cambios guardados.")
    setTimeout(() => setEditMessage(""), 2000)
  }

  async function handleCopyResetPassword() {
    await navigator.clipboard.writeText(resetPassword)
    setResetPasswordCopied(true)
    setTimeout(() => setResetPasswordCopied(false), 2000)
  }

  async function handleResetPassword() {
    if (!editingUser || !resetPassword) return

    if (resetPassword !== resetConfirmPassword) {
      setResetError("Las contraseñas no coinciden.")
      return
    }

    setResettingPassword(true)
    setResetError("")
    setResetMessage("")

    const { error: fnError } = await supabase.functions.invoke(
      "reset-password",
      { body: { userId: editingUser.id, password: resetPassword } }
    )

    setResettingPassword(false)

    if (fnError) {
      const detail = await extractFunctionErrorMessage(fnError)
      setResetError(detail ?? "No pudimos restablecer la contraseña.")
      return
    }

    setResetMessage("Contraseña restablecida.")
  }

  async function handleDelete(id: string) {
    const { error: deleteError } = await supabase.functions.invoke(
      "delete-user",
      { body: { userId: id } }
    )

    setDeletingId(null)

    if (deleteError) {
      setError("No pudimos eliminar el usuario.")
      return
    }

    setStaff((current) => current?.filter((row) => row.id !== id) ?? current)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Gestiona quién tiene acceso al sistema."
              : "Personas con acceso al sistema."}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openAddSheet} className="gap-1.5">
            <Plus className="size-4" />
            Agregar usuario
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!error && staff === null && (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      )}

      {staff !== null && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Rol</TableHead>
              {isCreator && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((row) => {
              const isProtected = row.email === CREATOR_EMAIL
              const canEdit = isCreator && !isProtected
              return (
                <TableRow
                  key={row.id}
                  onClick={canEdit ? () => openEditSheet(row) : undefined}
                  className={canEdit ? "cursor-pointer" : undefined}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        {row.photo && <AvatarImage src={row.photo} />}
                        <AvatarFallback>
                          {initialsFromName(row.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{row.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {row.role}
                    </Badge>
                  </TableCell>
                  {isCreator && (
                    <TableCell className="text-right">
                      {!isProtected && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          aria-label="Eliminar usuario"
                          onClick={(event) => {
                            event.stopPropagation()
                            setDeletingId(row.id)
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <Sheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Agregar usuario"
        description="Se crea el usuario, la contraseña y el rol de una sola vez."
        footer={
          <Button
            onClick={handleCreateUser}
            disabled={
              creating ||
              !newEmail ||
              !newName ||
              !newPassword ||
              newPassword !== confirmPassword
            }
            className="w-full"
          >
            {creating ? "Creando..." : "Crear usuario"}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-user-email">Correo</Label>
            <Input
              id="new-user-email"
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-user-name">Nombre</Label>
            <Input
              id="new-user-name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-user-role">Rol</Label>
            <Select
              id="new-user-role"
              value={newRole}
              onChange={(event) => setNewRole(event.target.value as Role)}
            >
              <option value="administrador">Administrador</option>
              <option value="editor">Editor</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-user-password">Contraseña</Label>
            <div className="flex gap-2">
              <Input
                id="new-user-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Generar contraseña"
                onClick={handleGeneratePassword}
              >
                <RefreshCw className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Copiar contraseña"
                onClick={handleCopyPassword}
              >
                <Copy className="size-4" />
              </Button>
            </div>
            {passwordCopied && (
              <p className="text-xs text-muted-foreground">Copiada.</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-user-confirm-password">
              Confirmar contraseña
            </Label>
            <Input
              id="new-user-confirm-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="font-mono"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive">
                Las contraseñas no coinciden.
              </p>
            )}
          </div>

          {createError && (
            <p className="text-sm text-destructive">{createError}</p>
          )}
        </div>
      </Sheet>

      <Sheet
        open={editingUser !== null}
        onClose={closeEditSheet}
        title={editingUser?.name}
        description={editingUser?.email}
      >
        {editingUser && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="size-16">
                  {editPhoto && <AvatarImage src={editPhoto} />}
                  <AvatarFallback className="text-base">
                    {initialsFromName(editName)}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="edit-user-photo"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  Cambiar foto
                </label>
                <input
                  id="edit-user-photo"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleEditPhotoChange}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Correo</Label>
                <p className="text-sm text-muted-foreground">
                  {editingUser.email}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-user-name">Nombre</Label>
                <Input
                  id="edit-user-name"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-user-role">Rol</Label>
                <Select
                  id="edit-user-role"
                  value={editRole}
                  onChange={(event) => setEditRole(event.target.value as Role)}
                >
                  <option value="administrador">Administrador</option>
                  <option value="editor">Editor</option>
                </Select>
              </div>

              {editError && (
                <p className="text-sm text-destructive">{editError}</p>
              )}
              {editMessage && (
                <p className="text-sm text-success">{editMessage}</p>
              )}

              <Button
                onClick={handleSaveEdit}
                disabled={savingEdit || !editName.trim()}
                className="self-start"
              >
                {savingEdit ? "Guardando..." : "Guardar"}
              </Button>
            </div>

            <div className="flex flex-col gap-4 border-t pt-4">
              <span className="text-sm font-semibold">
                Restablecer contraseña
              </span>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reset-password">Nueva contraseña</Label>
                <div className="flex gap-2">
                  <Input
                    id="reset-password"
                    value={resetPassword}
                    onChange={(event) => setResetPassword(event.target.value)}
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Generar contraseña"
                    onClick={() => setResetPassword(generatePassword())}
                  >
                    <RefreshCw className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Copiar contraseña"
                    onClick={handleCopyResetPassword}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
                {resetPasswordCopied && (
                  <p className="text-xs text-muted-foreground">Copiada.</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reset-confirm-password">
                  Confirmar contraseña
                </Label>
                <Input
                  id="reset-confirm-password"
                  value={resetConfirmPassword}
                  onChange={(event) =>
                    setResetConfirmPassword(event.target.value)
                  }
                  className="font-mono"
                />
                {resetConfirmPassword &&
                  resetPassword !== resetConfirmPassword && (
                    <p className="text-xs text-destructive">
                      Las contraseñas no coinciden.
                    </p>
                  )}
              </div>

              {resetError && (
                <p className="text-sm text-destructive">{resetError}</p>
              )}
              {resetMessage && (
                <p className="text-sm text-success">{resetMessage}</p>
              )}

              <Button
                variant="outline"
                onClick={handleResetPassword}
                disabled={
                  resettingPassword ||
                  !resetPassword ||
                  resetPassword !== resetConfirmPassword
                }
                className="self-start"
              >
                {resettingPassword ? "Restableciendo..." : "Restablecer contraseña"}
              </Button>
            </div>
          </div>
        )}
      </Sheet>

      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <UserCog className="size-5 text-destructive" />
              <h2 className="text-base font-semibold">¿Eliminar usuario?</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Esta acción es irreversible: la persona pierde el acceso de
              inmediato y no se puede deshacer.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeletingId(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deletingId)}
              >
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
