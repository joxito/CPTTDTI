import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { Check, CheckCircle2, Link as LinkIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Radio } from "@/components/ui/radio"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"

const overallRatingOptions = [
  "Excelente",
  "Muy bueno",
  "Bueno",
  "Regular",
  "Deficiente",
]

const satisfactionOptions = [
  "Muy satisfecho",
  "Bastante satisfecho",
  "Satisfecho",
  "Poco satisfecho",
  "Nada satisfecho",
]

function RequiredMark() {
  return <span className="text-destructive">*</span>
}

function RadioGroup({
  name,
  options,
  value,
  onChange,
}: {
  name: string
  options: string[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      {options.map((option) => (
        <label
          key={option}
          className="flex items-center gap-2 text-sm text-foreground"
        >
          <Radio
            name={name}
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
            required
          />
          {option}
        </label>
      ))}
    </div>
  )
}

type SatisfactionSurveyPageProps = {
  standalone?: boolean
}

export default function SatisfactionSurveyPage({
  standalone = false,
}: SatisfactionSurveyPageProps) {
  const { id: linkedServiceId } = useParams<{ id: string }>()
  const [submitted, setSubmitted] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const [email, setEmail] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [overallRating, setOverallRating] = useState("")
  const [staffKnowledge, setStaffKnowledge] = useState("")
  const [responseTime, setResponseTime] = useState("")
  const [recommendLikelihood, setRecommendLikelihood] = useState("")
  const [suggestedReferrals, setSuggestedReferrals] = useState("")
  const [suggestion, setSuggestion] = useState("")

  useEffect(() => {
    if (!linkedServiceId) return

    supabase
      .rpc("get_survey_link_info", { p_request_id: linkedServiceId })
      .single()
      .then(({ data }) => {
        const info = data as { business_name: string } | null
        if (info) setBusinessName(info.business_name)
      })
  }, [linkedServiceId])

  async function handleCopyLink() {
    const publicUrl = `${window.location.origin}/encuesta-satisfaccion/publico`
    await navigator.clipboard.writeText(publicUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  function renderShell(content: React.ReactNode) {
    if (!standalone) return content

    return (
      <div className="min-h-screen bg-muted/30 px-4 py-8 md:px-6">
        <div className="mx-auto mb-8 flex max-w-3xl items-center justify-center">
          <img
            src="/cptt-logo.png"
            alt="CPTTL"
            className="h-auto w-[min(90vw,373px)]"
          />
        </div>
        {content}
      </div>
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setSubmitError("")

    const { error } = await supabase.rpc("submit_satisfaction_survey", {
      p_survey: {
        email,
        business_name: businessName,
        overall_rating: overallRating,
        staff_knowledge_satisfaction: staffKnowledge,
        response_time_satisfaction: responseTime,
        recommend_likelihood: Number(recommendLikelihood),
        suggested_referrals: suggestedReferrals || null,
        suggestion: suggestion || null,
        service_request_id: linkedServiceId || null,
      },
    })

    setSubmitting(false)

    if (error) {
      setSubmitError(
        "No pudimos guardar la encuesta. Intenta de nuevo en unos minutos."
      )
      return
    }

    setSubmitted(true)
  }

  if (submitted) {
    return renderShell(
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-lg bg-success/10 text-success">
              <CheckCircle2 className="size-5" />
            </div>
            <CardTitle>Encuesta enviada</CardTitle>
            <CardDescription>
              Gracias por tu opinión. Nos ayuda a mejorar la calidad de
              nuestros servicios.
            </CardDescription>
            {!standalone && (
              <Button variant="outline" onClick={() => setSubmitted(false)}>
                Enviar otra respuesta
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
          Encuesta de Satisfacción
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card>
          <CardHeader className="border-b pb-4">
            <CardDescription>
              Su opinión es muy importante para mejorar la calidad de
              nuestros servicios. Las respuestas serán tratadas de forma
              confidencial y utilizadas únicamente con fines de mejora
              interna.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-6 pt-6 pb-6">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">
                1. Correo <RequiredMark />
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="businessName">
                2. Nombre o Empresa <RequiredMark />
              </Label>
              <Input
                id="businessName"
                name="businessName"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                readOnly={Boolean(linkedServiceId)}
                className={
                  linkedServiceId ? "bg-muted text-muted-foreground" : undefined
                }
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="overallRating">
                3. ¿Cómo calificaría la asistencia técnica recibida?{" "}
                <RequiredMark />
              </Label>
              <Select
                id="overallRating"
                name="overallRating"
                value={overallRating}
                onChange={(event) => setOverallRating(event.target.value)}
                required
                className="w-full max-w-xs"
              >
                <option value="" disabled>
                  Selecciona una opción
                </option>
                {overallRatingOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>
                4. ¿Qué tan satisfecho(a) está con el nivel de conocimiento
                técnico del personal que le brindó la asistencia?{" "}
                <RequiredMark />
              </Label>
              <RadioGroup
                name="staffKnowledge"
                options={satisfactionOptions}
                value={staffKnowledge}
                onChange={setStaffKnowledge}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>
                5. ¿Qué tan satisfecho(a) está con el tiempo de respuesta
                recibido desde su solicitud hasta la realización de la
                asistencia técnica? <RequiredMark />
              </Label>
              <RadioGroup
                name="responseTime"
                options={satisfactionOptions}
                value={responseTime}
                onChange={setResponseTime}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>
                6. ¿Qué tan probable es que recomiendes nuestros servicios?{" "}
                <RequiredMark />
              </Label>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground">
                  1 = Nada probable
                </span>
                {["1", "2", "3", "4", "5"].map((option) => (
                  <label
                    key={option}
                    className="flex flex-col items-center gap-1 text-sm text-foreground"
                  >
                    <Radio
                      name="recommendLikelihood"
                      value={option}
                      checked={recommendLikelihood === option}
                      onChange={() => setRecommendLikelihood(option)}
                      required
                    />
                    {option}
                  </label>
                ))}
                <span className="text-xs text-muted-foreground">
                  5 = Muy probable
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="suggestedReferrals">
                7. ¿Nos puede sugerir 3 emprendedores o MIPYMES que puedan
                estar interesados en nuestros servicios?
              </Label>
              <Textarea
                id="suggestedReferrals"
                name="suggestedReferrals"
                value={suggestedReferrals}
                onChange={(event) =>
                  setSuggestedReferrals(event.target.value)
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="suggestion">8. Sugerencia</Label>
              <Textarea
                id="suggestion"
                name="suggestion"
                value={suggestion}
                onChange={(event) => setSuggestion(event.target.value)}
              />
            </div>

            <img
              src="/logos-institucionales.png"
              alt="Gobierno de la República Dominicana - MICM, OEA, Instituto Politécnico Loyola"
              className="mx-auto w-full max-w-md"
            />
          </CardContent>
        </Card>

        {submitError && (
          <p className="text-sm text-destructive">{submitError}</p>
        )}

        <Button type="submit" disabled={submitting} className="self-end">
          {submitting ? "Enviando..." : "Enviar"}
        </Button>
      </form>
    </div>
  )
}
