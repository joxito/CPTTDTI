import { StatCard } from "@/components/dashboard/stat-card"
import { OverviewChart } from "@/components/dashboard/overview-chart"
import { TrafficSources } from "@/components/dashboard/traffic-sources"
import { MonthlyGoals } from "@/components/dashboard/monthly-goals"
import { RecentOrders } from "@/components/dashboard/recent-orders"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { statCards } from "@/data/dashboard-data"

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Bienvenido de nuevo. Esto es lo que está pasando con tu negocio hoy.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OverviewChart />
        </div>
        <TrafficSources />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <MonthlyGoals />
        <div className="lg:col-span-2">
          <RecentOrders />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <RecentActivity />
      </div>
    </div>
  )
}
