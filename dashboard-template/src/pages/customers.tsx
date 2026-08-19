import { useEffect, useMemo, useState } from "react"
import {
  Building2,
  Calendar,
  Check,
  Link as LinkIcon,
  Mail,
  MapPin,
  Pencil,
  PenOff,
  Phone,
  Search,
  Trash2,
  Users,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Combobox } from "@/components/ui/combobox"
import { MultiCombobox } from "@/components/ui/multi-combobox"
import { Sheet } from "@/components/ui/sheet"
import { SignatureCanvas } from "@/components/ui/signature-canvas"
import { dominicanProvinces } from "@/data/provinces"
import { municipalitiesByProvince } from "@/data/municipalities"
import {
  sectorOptions,
  serviceOptions,
  referralOptions,
} from "@/data/service-request-options"
import { formatCedula, formatPhoneNumber } from "@/lib/format"
import { supabase } from "@/lib/supabase"

type ServiceRequest = {
  id: string
  created_at: string
  business_name: string
  has_rnc: string
  rnc_number: string | null
  province: string
  municipality: string
  representative_name: string
  sex: string
  age: number
  phone: string
  is_owner: string
  id_number: string
  email: string
  sector: string
  sector_other: string | null
  business_description: string
  start_date: string
  employee_count: number
  address: string | null
  services: string[]
  referral: string
  referral_other: string | null
  signature: string | null
}

type EditableFields = Omit<ServiceRequest, "id" | "created_at">

function toEditableFields(request: ServiceRequest): EditableFields {
  const { id: _id, created_at: _createdAt, ...editable } = request
  return editable
}

function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <span className="text-sm">{value || "—"}</span>
    </div>
  )
}

export default function CustomersPage() {
  const [requests, setRequests] = useState<ServiceRequest[] | null>(null)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<ServiceRequest | null>(null)
  const [editing, setEditing] = useState(false)
  const [editValues, setEditValues] = useState<EditableFields | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [signLinkCopied, setSignLinkCopied] = useState(false)

  async function handleCopySignLink() {
    if (!selected) return
    const signUrl = `${window.location.origin}/firmar/${selected.id}`
    await navigator.clipboard.writeText(signUrl)
    setSignLinkCopied(true)
    setTimeout(() => setSignLinkCopied(false), 2000)
  }

  useEffect(() => {
    let cancelled = false

    async function loadRequests() {
      const { data, error } = await supabase
        .from("service_requests")
        .select(
          "id, created_at, business_name, has_rnc, rnc_number, province, municipality, representative_name, sex, age, phone, is_owner, id_number, email, sector, sector_other, business_description, start_date, employee_count, address, services, referral, referral_other, signature"
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false })

      if (cancelled) return

      if (error) {
        setError("No pudimos cargar los clientes. Intentá de nuevo más tarde.")
        return
      }

      setRequests(data)
    }

    loadRequests()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredRequests = useMemo(() => {
    if (!requests) return requests
    const normalizedQuery = query.trim().toLocaleLowerCase("es")
    if (!normalizedQuery) return requests

    return requests.filter((request) =>
      [
        request.business_name,
        request.representative_name,
        request.email,
        request.phone,
        request.province,
        request.municipality,
        request.sector,
      ]
        .join(" ")
        .toLocaleLowerCase("es")
        .includes(normalizedQuery)
    )
  }, [requests, query])

  function openRequest(request: ServiceRequest) {
    setSelected(request)
    setEditing(false)
    setSaveError("")
    setConfirmingDelete(false)
    setDeleteError("")
  }

  function closeSheet() {
    setSelected(null)
    setEditing(false)
    setEditValues(null)
    setSaveError("")
    setConfirmingDelete(false)
    setDeleteError("")
  }

  async function handleDelete() {
    if (!selected) return

    setDeleting(true)
    setDeleteError("")

    const { error } = await supabase
      .from("service_requests")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", selected.id)

    if (!error) {
      await supabase.from("service_request_changes").insert({
        service_request_id: selected.id,
        business_name: selected.business_name,
        action: "eliminado",
      })
    }

    setDeleting(false)

    if (error) {
      setDeleteError("No pudimos eliminar el cliente. Intentá de nuevo.")
      return
    }

    const deletedId = selected.id
    setRequests(
      (current) => current?.filter((request) => request.id !== deletedId) ?? current
    )
    closeSheet()
  }

  function startEditing() {
    if (!selected) return
    setEditValues(toEditableFields(selected))
    setEditing(true)
    setSaveError("")
  }

  function updateEditValue<Key extends keyof EditableFields>(
    key: Key,
    value: EditableFields[Key]
  ) {
    setEditValues((current) => (current ? { ...current, [key]: value } : current))
  }

  async function handleSave() {
    if (!selected || !editValues) return

    const changedFields: Record<string, { from: unknown; to: unknown }> = {}
    for (const key of Object.keys(editValues) as (keyof EditableFields)[]) {
      const before = JSON.stringify(selected[key])
      const after = JSON.stringify(editValues[key])
      if (before === after) continue

      if (key === "signature") {
        changedFields[key] = {
          from: selected.signature ? "(firma anterior)" : "(sin firma)",
          to: editValues.signature ? "(firma nueva)" : "(sin firma)",
        }
      } else {
        changedFields[key] = { from: selected[key], to: editValues[key] }
      }
    }

    if (Object.keys(changedFields).length === 0) {
      setEditing(false)
      return
    }

    setSaving(true)
    setSaveError("")

    const { error } = await supabase
      .from("service_requests")
      .update(editValues)
      .eq("id", selected.id)

    if (!error) {
      await supabase.from("service_request_changes").insert({
        service_request_id: selected.id,
        business_name: editValues.business_name,
        action: "editado",
        changed_fields: changedFields,
      })
    }

    setSaving(false)

    if (error) {
      setSaveError("No pudimos guardar los cambios. Intentá de nuevo.")
      return
    }

    const updated: ServiceRequest = { ...selected, ...editValues }
    setRequests(
      (current) =>
        current?.map((request) =>
          request.id === updated.id ? updated : request
        ) ?? current
    )
    setSelected(updated)
    setEditing(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
      </div>

      {requests !== null && requests.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por negocio, representante, correo..."
            className="pl-8"
          />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!error && requests === null && (
        <p className="text-sm text-muted-foreground">Cargando clientes...</p>
      )}

      {requests !== null && requests.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Users className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Todavía no hay solicitudes de clientes.
          </p>
        </div>
      )}

      {requests !== null &&
        requests.length > 0 &&
        filteredRequests?.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <Search className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No encontramos clientes que coincidan con "{query}".
            </p>
          </div>
        )}

      {filteredRequests !== null && filteredRequests.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRequests.map((request) => (
            <Card
              key={request.id}
              role="button"
              tabIndex={0}
              onClick={() => openRequest(request)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  openRequest(request)
                }
              }}
              className="cursor-pointer transition-colors hover:border-primary/50"
            >
              <CardHeader>
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="size-4" />
                </div>
                <CardTitle className="mt-2 text-base">
                  {request.business_name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {request.representative_name}
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 pb-6 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-3.5 shrink-0" />
                  <span className="truncate">{request.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-3.5 shrink-0" />
                  <span className="truncate">{request.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" />
                  <span className="truncate">
                    {request.municipality}, {request.province}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="size-3.5 shrink-0" />
                  <span>{formatDate(request.created_at)}</span>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {!request.signature && (
                    <Badge variant="destructive">
                      <PenOff className="size-3" />
                      Sin firmar
                    </Badge>
                  )}
                  <Badge variant="secondary">
                    {request.sector === "Otro"
                      ? request.sector_other
                      : request.sector}
                  </Badge>
                  {request.services.slice(0, 2).map((service) => (
                    <Badge key={service} variant="outline">
                      {service}
                    </Badge>
                  ))}
                  {request.services.length > 2 && (
                    <Badge variant="outline">
                      +{request.services.length - 2}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet
        open={selected !== null}
        onClose={closeSheet}
        title={selected?.business_name}
        description={
          selected ? `Recibida el ${formatDate(selected.created_at)}` : ""
        }
        footer={
          editing ? (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          ) : confirmingDelete ? (
            <div className="flex flex-col gap-2">
              {deleteError && (
                <p className="text-sm text-destructive">{deleteError}</p>
              )}
              <p className="text-sm text-muted-foreground">
                ¿Eliminar este cliente? Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Eliminando..." : "Sí, eliminar"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap justify-end gap-2">
              {selected && !selected.signature && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopySignLink}
                >
                  {signLinkCopied ? (
                    <>
                      <Check className="size-4" />
                      Enlace copiado
                    </>
                  ) : (
                    <>
                      <LinkIcon className="size-4" />
                      Enviar a firmar
                    </>
                  )}
                </Button>
              )}
              <Button
                type="button"
                variant="destructive"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 className="size-4" />
                Eliminar
              </Button>
              <Button type="button" onClick={startEditing}>
                <Pencil className="size-4" />
                Editar
              </Button>
            </div>
          )
        }
      >
        {selected && !editing && (
          <div className="flex flex-col gap-4">
            <DetailRow
              label="Nombre del Negocio o Emprendimiento"
              value={selected.business_name}
            />
            <DetailRow
              label="¿Posee RNC?"
              value={selected.has_rnc === "si" ? "Sí" : "No"}
            />
            {selected.has_rnc === "si" && (
              <DetailRow
                label="Número de RNC"
                value={selected.rnc_number}
              />
            )}
            <div className="grid grid-cols-2 gap-4">
              <DetailRow label="Provincia" value={selected.province} />
              <DetailRow label="Municipio" value={selected.municipality} />
            </div>
            <DetailRow
              label="Representante"
              value={selected.representative_name}
            />
            <div className="grid grid-cols-2 gap-4">
              <DetailRow
                label="Sexo"
                value={selected.sex === "femenino" ? "Femenino" : "Masculino"}
              />
              <DetailRow label="Edad" value={selected.age} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <DetailRow label="Teléfono" value={selected.phone} />
              <DetailRow
                label="¿Es dueño de la empresa?"
                value={selected.is_owner === "si" ? "Sí" : "No"}
              />
            </div>
            <DetailRow
              label="Número de Cédula de Identidad y Electoral"
              value={selected.id_number}
            />
            <DetailRow label="Correo Electrónico" value={selected.email} />
            <DetailRow
              label="Sector económico"
              value={
                selected.sector === "Otro"
                  ? selected.sector_other
                  : selected.sector
              }
            />
            <DetailRow
              label="Descripción del Negocio"
              value={selected.business_description}
            />
            <div className="grid grid-cols-2 gap-4">
              <DetailRow
                label="Fecha de inicio de operaciones"
                value={selected.start_date}
              />
              <DetailRow
                label="Número de empleados"
                value={selected.employee_count}
              />
            </div>
            <DetailRow label="Dirección" value={selected.address} />
            <DetailRow
              label="Servicios solicitados"
              value={
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {selected.services.map((service) => (
                    <Badge key={service} variant="outline">
                      {service}
                    </Badge>
                  ))}
                </div>
              }
            />
            <DetailRow
              label="¿Cómo se enteró de los servicios?"
              value={
                selected.referral === "Otro"
                  ? selected.referral_other
                  : selected.referral
              }
            />

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Firma
              </span>
              {selected.signature ? (
                <div className="flex h-24 w-full items-center justify-center rounded-lg border bg-white p-2">
                  <img
                    src={selected.signature}
                    alt="Firma del cliente"
                    className="h-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-24 w-full items-center justify-center rounded-lg border border-dashed bg-muted/30 text-xs text-muted-foreground">
                  Sin firma
                </div>
              )}
            </div>
          </div>
        )}

        {editValues && editing && (
          <div className="flex flex-col gap-4">
            {saveError && (
              <p className="text-sm text-destructive">{saveError}</p>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-business-name">
                Nombre del Negocio o Emprendimiento
              </Label>
              <Input
                id="edit-business-name"
                value={editValues.business_name}
                onChange={(event) =>
                  updateEditValue("business_name", event.target.value)
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-has-rnc">¿Posee RNC?</Label>
              <Select
                id="edit-has-rnc"
                value={editValues.has_rnc}
                onChange={(event) =>
                  updateEditValue("has_rnc", event.target.value)
                }
              >
                <option value="si">Sí</option>
                <option value="no">No</option>
              </Select>
            </div>

            {editValues.has_rnc === "si" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-rnc-number">Número de RNC</Label>
                <Input
                  id="edit-rnc-number"
                  value={editValues.rnc_number ?? ""}
                  onChange={(event) =>
                    updateEditValue("rnc_number", event.target.value)
                  }
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-province">Provincia</Label>
              <Combobox
                id="edit-province"
                value={editValues.province}
                onValueChange={(next) => {
                  updateEditValue("province", next)
                  updateEditValue("municipality", "")
                }}
                options={dominicanProvinces}
                placeholder="Seleccioná una provincia"
                searchPlaceholder="Buscar provincia..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-municipality">Municipio</Label>
              <Combobox
                id="edit-municipality"
                value={editValues.municipality}
                onValueChange={(next) => updateEditValue("municipality", next)}
                options={municipalitiesByProvince[editValues.province] ?? []}
                placeholder="Seleccioná un municipio"
                searchPlaceholder="Buscar municipio..."
                disabled={!editValues.province}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-representative">Representante</Label>
              <Input
                id="edit-representative"
                value={editValues.representative_name}
                onChange={(event) =>
                  updateEditValue("representative_name", event.target.value)
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-sex">Sexo</Label>
                <Select
                  id="edit-sex"
                  value={editValues.sex}
                  onChange={(event) =>
                    updateEditValue("sex", event.target.value)
                  }
                >
                  <option value="femenino">Femenino</option>
                  <option value="masculino">Masculino</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-age">Edad</Label>
                <Input
                  id="edit-age"
                  type="number"
                  min={0}
                  value={editValues.age}
                  onChange={(event) =>
                    updateEditValue("age", Number(event.target.value))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-phone">Teléfono</Label>
                <Input
                  id="edit-phone"
                  value={editValues.phone}
                  onChange={(event) =>
                    updateEditValue(
                      "phone",
                      formatPhoneNumber(event.target.value)
                    )
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-is-owner">¿Es dueño?</Label>
                <Select
                  id="edit-is-owner"
                  value={editValues.is_owner}
                  onChange={(event) =>
                    updateEditValue("is_owner", event.target.value)
                  }
                >
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-id-number">
                Número de Cédula de Identidad y Electoral
              </Label>
              <Input
                id="edit-id-number"
                value={editValues.id_number}
                onChange={(event) =>
                  updateEditValue(
                    "id_number",
                    formatCedula(event.target.value)
                  )
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-email">Correo Electrónico</Label>
              <Input
                id="edit-email"
                type="email"
                value={editValues.email}
                onChange={(event) =>
                  updateEditValue("email", event.target.value)
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-sector">Sector económico</Label>
              <Select
                id="edit-sector"
                value={editValues.sector}
                onChange={(event) =>
                  updateEditValue("sector", event.target.value)
                }
              >
                {sectorOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "Otro" ? "Otro (especificar)" : option}
                  </option>
                ))}
              </Select>
              {editValues.sector === "Otro" && (
                <Input
                  value={editValues.sector_other ?? ""}
                  onChange={(event) =>
                    updateEditValue("sector_other", event.target.value)
                  }
                  placeholder="Especificá el sector económico"
                />
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-description">
                Descripción del Negocio
              </Label>
              <Textarea
                id="edit-description"
                value={editValues.business_description}
                onChange={(event) =>
                  updateEditValue("business_description", event.target.value)
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-start-date">Fecha de inicio</Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={editValues.start_date}
                  onChange={(event) =>
                    updateEditValue("start_date", event.target.value)
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-employee-count">N.º de empleados</Label>
                <Input
                  id="edit-employee-count"
                  type="number"
                  min={0}
                  value={editValues.employee_count}
                  onChange={(event) =>
                    updateEditValue(
                      "employee_count",
                      Number(event.target.value)
                    )
                  }
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-address">Dirección</Label>
              <Input
                id="edit-address"
                value={editValues.address ?? ""}
                onChange={(event) =>
                  updateEditValue("address", event.target.value)
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Servicios solicitados</Label>
              <MultiCombobox
                values={editValues.services}
                onValuesChange={(next) => updateEditValue("services", next)}
                options={serviceOptions}
                placeholder="Seleccioná uno o más servicios"
                searchPlaceholder="Buscar servicio..."
                columns={1}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-referral">
                ¿Cómo se enteró de los servicios?
              </Label>
              <Select
                id="edit-referral"
                value={editValues.referral}
                onChange={(event) =>
                  updateEditValue("referral", event.target.value)
                }
              >
                {referralOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "Otro" ? "Otro (especificar)" : option}
                  </option>
                ))}
              </Select>
              {editValues.referral === "Otro" && (
                <Input
                  value={editValues.referral_other ?? ""}
                  onChange={(event) =>
                    updateEditValue("referral_other", event.target.value)
                  }
                  placeholder="Especificá cómo se enteró"
                />
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Firma</Label>
              <SignatureCanvas
                value={editValues.signature ?? ""}
                onChange={(next) => updateEditValue("signature", next || null)}
              />
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
