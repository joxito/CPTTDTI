import type { LucideIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type PlaceholderPageProps = {
  title: string
  description: string
  icon: LucideIcon
}

export function PlaceholderPage({
  title,
  description,
  icon: Icon,
}: PlaceholderPageProps) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
          <CardTitle className="mt-3">Página lista para construir</CardTitle>
          <CardDescription>
            Esta es una página de ejemplo dentro de la estructura del
            proyecto. Reemplazá este contenido por tus propios componentes.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6 text-sm text-muted-foreground">
          Encontrás esta ruta en{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            src/pages
          </code>{" "}
          y su entrada en{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            src/App.tsx
          </code>
          .
        </CardContent>
      </Card>
    </div>
  )
}
