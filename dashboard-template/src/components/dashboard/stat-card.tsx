import { ArrowDownRight, ArrowUpRight } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { StatCardData } from "@/data/dashboard-data"

export function StatCard({ label, value, delta, helper }: StatCardData) {
  const isPositive = delta >= 0

  return (
    <Card>
      <CardContent className="py-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="mt-2 flex items-end justify-between gap-2">
          <span className="text-2xl font-semibold tracking-tight">
            {value}
          </span>
          <span
            className={cn(
              "flex items-center gap-0.5 text-xs font-medium",
              isPositive ? "text-success" : "text-destructive"
            )}
          >
            {isPositive ? (
              <ArrowUpRight className="size-3.5" />
            ) : (
              <ArrowDownRight className="size-3.5" />
            )}
            {Math.abs(delta)}%
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  )
}
