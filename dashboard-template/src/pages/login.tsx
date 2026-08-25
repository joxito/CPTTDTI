import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"

import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError("")

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setSubmitting(false)

    if (signInError) {
      setError("Correo o contraseña incorrectos.")
      return
    }

    const redirectTo =
      (location.state as { from?: string } | null)?.from ?? "/"
    navigate(redirectTo, { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-8">
      <div className="mb-8 flex items-center justify-center">
        <img
          src="/cptt-logo.png"
          alt="CPTTL"
          className="h-auto w-[min(90vw,280px)]"
        />
      </div>

      <div className="w-full max-w-sm">
        <Card>
          <CardContent className="flex flex-col gap-4 py-8">
            <div className="text-center">
              <CardTitle>Iniciar sesión</CardTitle>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" disabled={submitting}>
                {submitting ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
