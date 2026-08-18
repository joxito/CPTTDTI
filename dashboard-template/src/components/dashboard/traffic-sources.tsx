import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { trafficSources } from "@/data/dashboard-data"

export function TrafficSources() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Fuentes de tráfico</CardTitle>
        <CardDescription>De dónde vienen tus visitantes</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 pb-6 sm:flex-row">
        <div className="relative h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={trafficSources}
                dataKey="value"
                nameKey="name"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={2}
                strokeWidth={0}
              >
                {trafficSources.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-semibold">100%</span>
            <span className="text-xs text-muted-foreground">Visitas</span>
          </div>
        </div>

        <ul className="w-full space-y-2.5">
          {trafficSources.map((source) => (
            <li
              key={source.name}
              className="flex items-center justify-between text-sm"
            >
              <span className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: source.color }}
                />
                {source.name}
              </span>
              <span className="font-medium">{source.value}%</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
