import * as React from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { monthlyPerformance } from "@/data/dashboard-data"

type Metric = "revenue" | "orders" | "profit"

const metricConfig: Record<
  Metric,
  { label: string; color: string; formatter: (v: number) => string }
> = {
  revenue: {
    label: "Ingresos",
    color: "var(--chart-1)",
    formatter: (v) => `$${(v / 1000).toFixed(0)}k`,
  },
  orders: {
    label: "Órdenes",
    color: "var(--chart-2)",
    formatter: (v) => `${v}`,
  },
  profit: {
    label: "Ganancia",
    color: "var(--chart-3)",
    formatter: (v) => `$${(v / 1000).toFixed(0)}k`,
  },
}

export function OverviewChart() {
  const [metric, setMetric] = React.useState<Metric>("revenue")
  const config = metricConfig[metric]

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Resumen</CardTitle>
          <CardDescription>Desempeño mensual del año actual</CardDescription>
        </div>
        <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
          <TabsList>
            <TabsTrigger value="revenue">Ingresos</TabsTrigger>
            <TabsTrigger value="orders">Órdenes</TabsTrigger>
            <TabsTrigger value="profit">Ganancia</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="pb-6">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={monthlyPerformance}
              margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="overviewFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={config.color}
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="95%"
                    stopColor={config.color}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                stroke="var(--muted-foreground)"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={12}
                stroke="var(--muted-foreground)"
                tickFormatter={config.formatter}
                width={48}
              />
              <Tooltip
                formatter={(value) => [
                  config.formatter(Number(value)),
                  config.label,
                ]}
                labelClassName="text-foreground"
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  borderColor: "var(--border)",
                  borderRadius: "var(--radius-md)",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey={metric}
                stroke={config.color}
                strokeWidth={2}
                fill="url(#overviewFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
