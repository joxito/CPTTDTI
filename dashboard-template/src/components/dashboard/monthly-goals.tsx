import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { monthlyGoals } from "@/data/dashboard-data"

function formatValue(value: number, unit: string) {
  if (unit === "$") return `$${value.toLocaleString("es")}`
  if (unit === "%") return `${value}%`
  return value.toLocaleString("es")
}

export function MonthlyGoals() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Metas mensuales</CardTitle>
        <CardDescription>Progreso hacia tus objetivos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pb-6">
        {monthlyGoals.map((goal) => (
          <div key={goal.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{goal.label}</span>
              <span className="text-muted-foreground">{goal.progress}%</span>
            </div>
            <Progress value={goal.progress} />
            <p className="text-xs text-muted-foreground">
              {formatValue(goal.current, goal.unit)} de{" "}
              {formatValue(goal.target, goal.unit)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
