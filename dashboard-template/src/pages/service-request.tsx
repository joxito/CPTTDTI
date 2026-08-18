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

export default function ServiceRequestPage() {
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Solicitud de Servicios
        </h1>
        <p className="text-sm text-muted-foreground">
          Completá el formulario para solicitar un servicio del centro de
          prototipado.
        </p>
      </div>

      <Card>
        {submitted ? (
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-lg bg-success/10 text-success">
              <CheckCircle2 className="size-5" />
            </div>
            <CardTitle>Solicitud enviada</CardTitle>
            <CardDescription>
              Recibimos tu solicitud. Nos vamos a contactar a la brevedad.
            </CardDescription>
            <Button variant="outline" onClick={() => setSubmitted(false)}>
              Enviar otra solicitud
            </Button>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ClipboardList className="size-5" />
              </div>
              <CardTitle className="mt-3">Datos de la solicitud</CardTitle>
              <CardDescription>
                Contanos qué necesitás y te vamos a responder por correo.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-4 pb-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fullName">Nombre completo</Label>
                  <Input id="fullName" name="fullName" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="serviceType">Servicio solicitado</Label>
                <Select id="serviceType" name="serviceType" defaultValue="" required>
                  <option value="" disabled>
                    Seleccioná un servicio
                  </option>
                  <option value="impresion-3d">Impresión 3D</option>
                  <option value="corte-laser">Corte láser</option>
                  <option value="diseno-cad">Diseño CAD</option>
                  <option value="prototipado-electronico">
                    Prototipado electrónico
                  </option>
                  <option value="otro">Otro</option>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="deadline">Fecha deseada de entrega</Label>
                <Input id="deadline" name="deadline" type="date" />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Descripción del proyecto</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Contanos los detalles de lo que necesitás prototipar o fabricar..."
                  required
                />
              </div>
            </CardContent>

            <CardFooter>
              <Button type="submit">Enviar solicitud</Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  )
}
