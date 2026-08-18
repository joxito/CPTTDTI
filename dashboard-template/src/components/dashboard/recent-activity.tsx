import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { recentActivity } from "@/data/dashboard-data"

export function RecentActivity() {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>Actividad reciente</CardTitle>
          <CardDescription>Últimos eventos de tu tienda</CardDescription>
        </div>
        <CardAction>
          <Button variant="outline" size="sm">
            Ver todas
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="pb-6">
        <ul className="space-y-4">
          {recentActivity.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {item.description}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.time}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
