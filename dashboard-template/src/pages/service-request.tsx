import { useState } from "react"
import { ClipboardList, CheckCircle2 } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Radio } from "@/components/ui/radio"
import { dominicanProvinces } from "@/data/provinces"

const sectorOptions = [
  "Manufactura",
  "Comercio",
  "Metalmecánica",
  "Servicios",
  "Artesanías",
  "Belleza y Cuidado de la Piel",
  "Cosmético",
  "Metalurgia",
  "Alimentos y bebidas",
  "Otro",
]

const serviceOptions = [
  "Diseño de modelos 3D",
  "Digitalización de modelos 3D",
  "Rediseño y adaptación de modelos 3D",
  "Fabricación de prototipos",
  "Diseños de planos",
  "Digitalización de procesos",
  "Capacitaciones técnicas especializadas",
  "Aplicación metodología 6S",
  "Estandarización de procesos industriales",
  "Asistencia técnica especializada",
]

const referralOptions = [
  "Redes Sociales",
  "Charlas o Capacitaciones",
  "Ferias",
  "Eventos",
  "Por referencia de alguien",
  "Por el Instituto Politécnico Loyola",
  "Otro",
]

function RequiredMark() {
  return <span className="text-destructive">*</span>
}

export default function ServiceRequestPage() {
  const [submitted, setSubmitted] = useState(false)
  const [sector, setSector] = useState("")
  const [referral, setReferral] = useState("")

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-lg bg-success/10 text-success">
              <CheckCircle2 className="size-5" />
            </div>
            <CardTitle>Solicitud enviada</CardTitle>
            <CardDescription>
              Recibimos tu solicitud de servicios. El equipo del CPTT-Loyola
              se va a contactar contigo a la brevedad.
            </CardDescription>
            <Button variant="outline" onClick={() => setSubmitted(false)}>
              Enviar otra solicitud
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Solicitud de Servicios – Centro de Prototipado
        </h1>
        <p className="text-sm text-muted-foreground">
          Centro de Prototipado y Transferencia Tecnológica (CPTT-LOYOLA)
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Este formulario es para hacer solicitud de los servicios de
          asesoría del Centro de Prototipado y Transferencia Tecnológica
          CPTT-LOYOLA. Los campos marcados con (<RequiredMark />) son
          obligatorios.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardList className="size-5" />
            </div>
            <CardTitle className="mt-3">
              Sección 1 — Datos del Negocio y del Representante
            </CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-5 pb-6">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="businessName">
                1. Nombre del Negocio o Emprendimiento <RequiredMark />
              </Label>
              <Input id="businessName" name="businessName" required />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>
                2. ¿Posee RNC? <RequiredMark />
              </Label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Radio name="hasRnc" value="si" required /> Sí
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Radio name="hasRnc" value="no" /> No
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rncNumber">
                3. Número de RNC (si aplica) / N.º de cédula si es persona
                física
              </Label>
              <Input id="rncNumber" name="rncNumber" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="province">
                  4. ¿En cuál provincia se encuentra la empresa?{" "}
                  <RequiredMark />
                </Label>
                <Select id="province" name="province" defaultValue="" required>
                  <option value="" disabled>
                    Seleccioná una provincia
                  </option>
                  {dominicanProvinces.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="municipality">
                  5. Municipio <RequiredMark />
                </Label>
                <Input id="municipality" name="municipality" required />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="representativeName">
                6. Nombre y apellido del representante <RequiredMark />
              </Label>
              <Input
                id="representativeName"
                name="representativeName"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>
                  7. Sexo <RequiredMark />
                </Label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <Radio name="sex" value="femenino" required /> Femenino
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Radio name="sex" value="masculino" /> Masculino
                  </label>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="age">
                  8. Edad <RequiredMark />
                </Label>
                <Input id="age" name="age" type="number" min={0} required />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">
                  9. Teléfono <RequiredMark />
                </Label>
                <Input id="phone" name="phone" type="tel" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>
                  10. ¿Es dueño de la empresa? <RequiredMark />
                </Label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <Radio name="isOwner" value="si" required /> Sí
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Radio name="isOwner" value="no" /> No
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="idNumber">
                11. Número de Cédula de Identidad y Electoral{" "}
                <RequiredMark />
              </Label>
              <Input id="idNumber" name="idNumber" required />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="idPhotos">
                12. Fotografías de ambos lados de la Cédula <RequiredMark />
              </Label>
              <Input
                id="idPhotos"
                name="idPhotos"
                type="file"
                accept="image/*"
                multiple
                required
              />
              <p className="text-xs text-muted-foreground">
                Hasta 5 imágenes, máx. 100 MB por archivo.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">
                13. Correo Electrónico <RequiredMark />
              </Label>
              <Input id="email" name="email" type="email" required />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sector">
                14. Sector económico al que pertenece la empresa{" "}
                <RequiredMark />
              </Label>
              <Select
                id="sector"
                name="sector"
                value={sector}
                onChange={(event) => setSector(event.target.value)}
                required
              >
                <option value="" disabled>
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
                15. Breve descripción del Negocio o Emprendimiento{" "}
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
                  16. Fecha en que inició operaciones el negocio{" "}
                  <RequiredMark />
                </Label>
                <Input id="startDate" name="startDate" type="date" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="employeeCount">
                  17. Número total de empleados <RequiredMark />
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
              <Label htmlFor="address">18. Dirección física de la empresa</Label>
              <Input id="address" name="address" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>
                19. ¿Cuál o cuáles servicios le gustaría solicitar al Centro?{" "}
                <RequiredMark />
              </Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {serviceOptions.map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox name="services" value={option} />
                    {option}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="referral">
                20. ¿Cómo te enteraste de nuestros servicios? <RequiredMark />
              </Label>
              <Select
                id="referral"
                name="referral"
                value={referral}
                onChange={(event) => setReferral(event.target.value)}
                required
              >
                <option value="" disabled>
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
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sección 2 — Acuerdo y Confidencialidad</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 pb-6">
            <p className="text-sm text-muted-foreground">
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
              <Label>
                21. Confidencialidad <RequiredMark />
              </Label>
              <p className="text-sm text-muted-foreground">
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
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Radio name="confidentiality" value="si" required /> Sí
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Radio name="confidentiality" value="no" /> No
                </label>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit">Enviar solicitud</Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
