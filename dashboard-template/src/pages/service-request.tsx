import { useEffect, useRef, useState } from "react"
import {
  Camera,
  Check,
  CheckCircle2,
  Link as LinkIcon,
  Signature,
  Upload,
  X,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
import { MultiCombobox } from "@/components/ui/multi-combobox"
import { CameraCapture } from "@/components/ui/camera-capture"
import { Textarea } from "@/components/ui/textarea"
import { dominicanProvinces } from "@/data/provinces"
import { municipalitiesByProvince } from "@/data/municipalities"
import {
  sectorOptions,
  serviceOptions,
  referralOptions,
} from "@/data/service-request-options"
import {
  emailPattern,
  validAreaCodes,
  formatPhoneNumber,
  formatCedula,
} from "@/lib/format"
import { supabase } from "@/lib/supabase"

function RequiredMark() {
  return <span className="text-destructive">*</span>
}

type ServiceRequestPageProps = {
  standalone?: boolean
}

export default function ServiceRequestPage({
  standalone = false,
}: ServiceRequestPageProps) {
  const [submitted, setSubmitted] = useState(false)
  const [sector, setSector] = useState("")
  const [referral, setReferral] = useState("")
  const [hasRnc, setHasRnc] = useState("")
  const [province, setProvince] = useState("")
  const [municipality, setMunicipality] = useState("")
  const [phone, setPhone] = useState("")
  const [idNumber, setIdNumber] = useState("")
  const [idPhotos, setIdPhotos] = useState<File[]>([])
  const [idPhotosError, setIdPhotosError] = useState("")
  const [hasCamera, setHasCamera] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [emailTouched, setEmailTouched] = useState(false)
  const [services, setServices] = useState<string[]>([])
  const [step, setStep] = useState<1 | 2>(1)
  const [linkCopied, setLinkCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const section1Ref = useRef<HTMLDivElement>(null)
  const section2Ref = useRef<HTMLDivElement>(null)
  const idPhotosInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const input = idPhotosInputRef.current
    if (!input) return
    const dataTransfer = new DataTransfer()
    idPhotos.forEach((file) => dataTransfer.items.add(file))
    input.files = dataTransfer.files
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
      setIdPhotosError("Solo podés subir un máximo de 2 fotos.")
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

  async function handleCopyLink() {
    const publicUrl = `${window.location.origin}/solicitud-servicios/publico`
    await navigator.clipboard.writeText(publicUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  function renderShell(content: React.ReactNode) {
    if (!standalone) return content

    return (
      <div className="min-h-screen bg-muted/30 px-4 py-8 md:px-6">
        <div className="mx-auto mb-8 flex max-w-3xl items-center justify-center">
          <img src="/cptt-logo.png" alt="CPTTL" className="h-36 w-auto" />
        </div>
        {content}
      </div>
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const section1Controls = Array.from(
      section1Ref.current?.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >("input, select, textarea") ?? []
    )
    const section2Controls = Array.from(
      section2Ref.current?.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >("input, select, textarea") ?? []
    )

    const firstInvalidInSection1 = section1Controls.find(
      (control) => !control.checkValidity()
    )
    const firstInvalidInSection2 = section2Controls.find(
      (control) => !control.checkValidity()
    )
    const firstInvalid = firstInvalidInSection1 ?? firstInvalidInSection2

    if (firstInvalid) {
      setStep(firstInvalidInSection1 ? 1 : 2)
      setTimeout(() => firstInvalid.reportValidity(), 0)
      return
    }

    const formData = new FormData(event.currentTarget)
    setSubmitting(true)
    setSubmitError("")

    const { data, error } = await supabase
      .from("service_requests")
      .insert({
        business_name: formData.get("businessName"),
        has_rnc: formData.get("hasRnc"),
        rnc_number: formData.get("rncNumber") || null,
        province: formData.get("province"),
        municipality: formData.get("municipality"),
        representative_name: formData.get("representativeName"),
        sex: formData.get("sex"),
        age: Number(formData.get("age")),
        phone: formData.get("phone"),
        is_owner: formData.get("isOwner"),
        id_number: formData.get("idNumber"),
        email: formData.get("email"),
        sector: formData.get("sector"),
        sector_other: formData.get("sectorOther") || null,
        business_description: formData.get("businessDescription"),
        start_date: formData.get("startDate"),
        employee_count: Number(formData.get("employeeCount")),
        address: formData.get("address") || null,
        services,
        referral: formData.get("referral"),
        referral_other: formData.get("referralOther") || null,
        confidentiality: formData.get("confidentiality"),
      })
      .select("id, business_name")
      .single()

    if (!error && data) {
      await supabase.from("service_request_changes").insert({
        service_request_id: data.id,
        business_name: data.business_name,
        action: "creado",
      })
    }

    setSubmitting(false)

    if (error) {
      setSubmitError(
        "No pudimos guardar la solicitud. Intentá de nuevo en unos minutos."
      )
      return
    }

    setSubmitted(true)
  }

  const phoneAreaCode = phone.slice(0, 3)
  const isPhoneAreaCodeInvalid =
    phoneAreaCode.length === 3 && !validAreaCodes.includes(phoneAreaCode)

  const isEmailInvalid =
    emailTouched && email.length > 0 && !emailPattern.test(email)

  if (submitted) {
    return renderShell(
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-lg bg-success/10 text-success">
              <CheckCircle2 className="size-5" />
            </div>
            <CardTitle>Solicitud enviada</CardTitle>
            <CardDescription>
              Recibimos tu solicitud de servicios. El equipo del CPTTL
              se va a contactar contigo a la brevedad.
            </CardDescription>
            {!standalone && (
              <Button variant="outline" onClick={() => setSubmitted(false)}>
                Enviar otra solicitud
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return renderShell(
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Solicitud de Servicios
        </h1>
        {!standalone && (
          <Button type="button" variant="outline" onClick={handleCopyLink}>
            {linkCopied ? (
              <>
                <Check className="size-4" />
                Enlace copiado
              </>
            ) : (
              <>
                <LinkIcon className="size-4" />
                Enviar a un cliente
              </>
            )}
          </Button>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-6"
      >
        <Card ref={section1Ref} className={step !== 1 ? "hidden" : undefined}>
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-lg font-semibold">
              Sección 1 — Datos del Negocio y del Representante
            </CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-5 pt-6 pb-6">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="businessName">
                1. Nombre del Negocio o Emprendimiento <RequiredMark />
              </Label>
              <Input id="businessName" name="businessName" required />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="hasRnc">
                2. ¿Posee RNC? <RequiredMark />
              </Label>
              <Select
                id="hasRnc"
                name="hasRnc"
                value={hasRnc}
                onChange={(event) => setHasRnc(event.target.value)}
                required
              >
                <option value="">
                  Seleccioná una opción
                </option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </Select>
            </div>

            {hasRnc === "si" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rncNumber">
                  Número de RNC (si aplica) / N.º de cédula si es persona
                  física <RequiredMark />
                </Label>
                <Input id="rncNumber" name="rncNumber" required />
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="province">
                  3. ¿En cuál provincia se encuentra la empresa?{" "}
                  <RequiredMark />
                </Label>
                <Combobox
                  id="province"
                  name="province"
                  value={province}
                  onValueChange={(next) => {
                    setProvince(next)
                    setMunicipality("")
                  }}
                  options={dominicanProvinces}
                  placeholder="Seleccioná una provincia"
                  searchPlaceholder="Buscar provincia..."
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="municipality">
                  4. Municipio <RequiredMark />
                </Label>
                <Combobox
                  id="municipality"
                  name="municipality"
                  value={municipality}
                  onValueChange={setMunicipality}
                  options={municipalitiesByProvince[province] ?? []}
                  placeholder={
                    province
                      ? "Seleccioná un municipio"
                      : "Primero seleccioná una provincia"
                  }
                  searchPlaceholder="Buscar municipio..."
                  disabled={!province}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="representativeName">
                5. Nombre y apellido del representante <RequiredMark />
              </Label>
              <Input
                id="representativeName"
                name="representativeName"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sex">
                  6. Sexo <RequiredMark />
                </Label>
                <Select id="sex" name="sex" defaultValue="" required>
                  <option value="">
                    Seleccioná una opción
                  </option>
                  <option value="femenino">Femenino</option>
                  <option value="masculino">Masculino</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="age">
                  7. Edad <RequiredMark />
                </Label>
                <Input id="age" name="age" type="number" min={0} required />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">
                  8. Teléfono <RequiredMark />
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(event) =>
                    setPhone(formatPhoneNumber(event.target.value))
                  }
                  placeholder="Ej. 809-555-1234"
                  pattern="(809|829|849)-\d{3}-\d{4}"
                  title="El teléfono debe tener un código de área válido (809, 829 u 849) en el formato 809-555-1234"
                  aria-invalid={isPhoneAreaCodeInvalid}
                  required
                />
                {isPhoneAreaCodeInvalid && (
                  <p className="text-xs text-destructive">
                    El código de área debe ser 809, 829 u 849.
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="isOwner">
                  9. ¿Es dueño de la empresa? <RequiredMark />
                </Label>
                <Select id="isOwner" name="isOwner" defaultValue="" required>
                  <option value="">
                    Seleccioná una opción
                  </option>
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="idNumber">
                10. Número de Cédula de Identidad y Electoral{" "}
                <RequiredMark />
              </Label>
              <Input
                id="idNumber"
                name="idNumber"
                inputMode="numeric"
                value={idNumber}
                onChange={(event) =>
                  setIdNumber(formatCedula(event.target.value))
                }
                placeholder="Ej. 001-1234567-8"
                pattern="\d{3}-\d{7}-\d{1}"
                title="El número de cédula debe tener el formato 000-0000000-0"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="idPhotos">
                11. Fotografías de ambos lados de la Cédula <RequiredMark />
              </Label>

              <div className="flex flex-wrap gap-2">
                <label
                  htmlFor="idPhotosUpload"
                  className={buttonVariants({ variant: "outline" })}
                >
                  <Upload className="size-4" />
                  Subir documento
                </label>
                {hasCamera && (
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
                accept="image/*"
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
                onCapture={(file) => {
                  addIdPhotos([file])
                  setCameraOpen(false)
                }}
              />
              {/* Control real (oculto) que participa de la validación del formulario. */}
              <input
                ref={idPhotosInputRef}
                id="idPhotos"
                name="idPhotos"
                type="file"
                required
                tabIndex={-1}
                onChange={() => {}}
                className="sr-only"
              />

              {idPhotos.length > 0 && (
                <ul className="flex flex-col gap-1.5">
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
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">
                12. Correo Electrónico <RequiredMark />
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={() => setEmailTouched(true)}
                placeholder="Ej. nombre@correo.com"
                aria-invalid={isEmailInvalid}
                required
              />
              {isEmailInvalid && (
                <p className="text-xs text-destructive">
                  Ingresá un correo electrónico válido.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sector">
                13. Sector económico al que pertenece la empresa{" "}
                <RequiredMark />
              </Label>
              <Select
                id="sector"
                name="sector"
                value={sector}
                onChange={(event) => setSector(event.target.value)}
                required
              >
                <option value="">
                  Seleccioná un sector
                </option>
                {sectorOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "Otro" ? "Otro (especificar)" : option}
                  </option>
                ))}
              </Select>
              {sector === "Otro" && (
                <Input
                  name="sectorOther"
                  placeholder="Especificá el sector económico"
                  required
                />
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="businessDescription">
                14. Breve descripción del Negocio o Emprendimiento{" "}
                <RequiredMark />
              </Label>
              <Textarea
                id="businessDescription"
                name="businessDescription"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="startDate">
                  15. Fecha en que inició operaciones el negocio{" "}
                  <RequiredMark />
                </Label>
                <Input id="startDate" name="startDate" type="date" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="employeeCount">
                  16. Número total de empleados <RequiredMark />
                </Label>
                <Input
                  id="employeeCount"
                  name="employeeCount"
                  type="number"
                  min={0}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address">17. Dirección física de la empresa</Label>
              <Input id="address" name="address" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>
                18. ¿Cuál o cuáles servicios le gustaría solicitar al Centro?{" "}
                <RequiredMark />
              </Label>
              <MultiCombobox
                name="services"
                values={services}
                onValuesChange={setServices}
                options={serviceOptions}
                placeholder="Seleccioná uno o más servicios"
                searchPlaceholder="Buscar servicio..."
                columns={2}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="referral">
                19. ¿Cómo te enteraste de nuestros servicios? <RequiredMark />
              </Label>
              <Select
                id="referral"
                name="referral"
                value={referral}
                onChange={(event) => setReferral(event.target.value)}
                required
              >
                <option value="">
                  Seleccioná una opción
                </option>
                {referralOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "Otro" ? "Otro (especificar)" : option}
                  </option>
                ))}
              </Select>
              {referral === "Otro" && (
                <Input
                  name="referralOther"
                  placeholder="Especificá cómo te enteraste"
                  required
                />
              )}
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="button" onClick={() => setStep(2)}>
              Siguiente
            </Button>
          </CardFooter>
        </Card>

        <Card ref={section2Ref} className={step !== 2 ? "hidden" : undefined}>
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-lg font-semibold">
              Sección 2 — Acuerdo y Confidencialidad
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 pt-6 pb-6">
            <p className="text-justify text-sm text-muted-foreground">
              Yo declaro bajo juramento que la información proporcionada es
              verídica. Yo estoy de acuerdo en participar si soy seleccionado
              para contestar la encuesta de evaluación de los servicios de
              asesoría recibidos del Centro de Prototipado y Transferencia
              Tecnológica. Autorizo al MICM y al Centro de Prototipado y
              Transferencia Tecnológica el uso de mi nombre y domicilio para
              las encuestas de MICM. Yo autorizo al Centro de Prototipado y
              Transferencia Tecnológica para proporcionar la información
              relevante al asesor(a) asignado. Yo entiendo que el asesor(a) ha
              acordado: 1) no recomendar servicios o bienes en el cual tenga
              interés personal. 2) no aceptar comisiones o pagos por el
              asesoramiento. Yo acepto dar un aporte empresarial en aquellos
              servicios que me ofrezca el Centro de Prototipado y
              Transferencia Tecnológica y que tengan un costo para mí como
              empresario.
            </p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confidentiality">
                20. Confidencialidad <RequiredMark />
              </Label>
              <p className="text-justify text-sm text-muted-foreground">
                El Centro de Prototipado y Transferencia Tecnológica
                mantendrá estricta confidencialidad e imparcialidad durante
                la ejecución de los trabajos aquí descritos, así como al
                término de los mismos. De la misma manera, las informaciones
                a las que el Centro de Prototipado y Transferencia
                Tecnológica tendrá acceso directa o indirectamente quedarán
                sujetas a esta cláusula. El Centro de Prototipado y
                Transferencia Tecnológica exigirá compromisos de
                confidencialidad e imparcialidad similares a terceros,
                auditores y a los que el centro tenga que involucrar para el
                cumplimiento de los objetivos de esta propuesta. En caso de
                requerimiento de tipo judicial, ordenado por un juez
                competente, el Centro de Prototipado y Transferencia
                Tecnológica quedará liberado de dicha confidencialidad y se
                contactará al cliente para informarle.
              </p>
              <Select
                id="confidentiality"
                name="confidentiality"
                defaultValue=""
                required
              >
                <option value="">
                  Seleccioná una opción
                </option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="signature">21. Firma</Label>
              <div
                id="signature"
                className="flex h-24 w-full items-center justify-center rounded-lg border border-dashed border-input bg-muted/30"
              >
                <Signature className="size-6 text-muted-foreground" />
              </div>
            </div>

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}
          </CardContent>
          <CardFooter className="justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Atrás
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enviando..." : "Enviar solicitud"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
