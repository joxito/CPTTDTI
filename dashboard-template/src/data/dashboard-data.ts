// Datos de ejemplo (mock) para la plantilla del dashboard.
// Reemplazá esto por datos reales de tu API/backend.

export type StatCardData = {
  label: string
  value: string
  delta: number
  helper: string
}

export const statCards: StatCardData[] = [
  {
    label: "Ingresos totales",
    value: "$86,240",
    delta: 14.2,
    helper: "vs. mes anterior",
  },
  {
    label: "Clientes nuevos",
    value: "1,204",
    delta: 6.8,
    helper: "vs. mes anterior",
  },
  {
    label: "Órdenes totales",
    value: "972",
    delta: -2.4,
    helper: "vs. mes anterior",
  },
  {
    label: "Tasa de conversión",
    value: "4.6%",
    delta: 0.8,
    helper: "vs. mes anterior",
  },
]

export type MonthlyPerformance = {
  month: string
  revenue: number
  orders: number
  profit: number
}

export const monthlyPerformance: MonthlyPerformance[] = [
  { month: "Ene", revenue: 22000, orders: 320, profit: 8200 },
  { month: "Feb", revenue: 25400, orders: 356, profit: 9100 },
  { month: "Mar", revenue: 29800, orders: 401, profit: 10800 },
  { month: "Abr", revenue: 27600, orders: 388, profit: 9700 },
  { month: "May", revenue: 33200, orders: 452, profit: 12400 },
  { month: "Jun", revenue: 38900, orders: 501, profit: 14600 },
  { month: "Jul", revenue: 41200, orders: 534, profit: 15800 },
  { month: "Ago", revenue: 44800, orders: 561, profit: 17200 },
  { month: "Sep", revenue: 47200, orders: 588, profit: 18100 },
  { month: "Oct", revenue: 52600, orders: 620, profit: 20300 },
  { month: "Nov", revenue: 58400, orders: 671, profit: 22900 },
  { month: "Dic", revenue: 86240, orders: 972, profit: 31500 },
]

export type TrafficSource = {
  name: string
  value: number
  color: string
}

export const trafficSources: TrafficSource[] = [
  { name: "Directo", value: 40, color: "var(--chart-1)" },
  { name: "Orgánico", value: 30, color: "var(--chart-2)" },
  { name: "Referidos", value: 18, color: "var(--chart-3)" },
  { name: "Redes sociales", value: 12, color: "var(--chart-4)" },
]

export type MonthlyGoal = {
  label: string
  current: number
  target: number
  unit: string
  progress: number
}

export const monthlyGoals: MonthlyGoal[] = [
  {
    label: "Ingresos mensuales",
    current: 86240,
    target: 94000,
    unit: "$",
    progress: 92,
  },
  {
    label: "Clientes nuevos",
    current: 1204,
    target: 1500,
    unit: "",
    progress: 80,
  },
  {
    label: "Tasa de retención",
    current: 4.4,
    target: 5,
    unit: "%",
    progress: 88,
  },
]

export type OrderStatus = "Completado" | "Procesando" | "Pendiente" | "Cancelado"

export type RecentOrder = {
  initials: string
  name: string
  email: string
  orderId: string
  product: string
  status: OrderStatus
  amount: string
}

export const recentOrders: RecentOrder[] = [
  {
    initials: "LF",
    name: "Laura Fernández",
    email: "laura@ejemplo.com",
    orderId: "ORD-3021",
    product: "Plan Profesional",
    status: "Completado",
    amount: "$249.00",
  },
  {
    initials: "MR",
    name: "Marco Rossi",
    email: "marco@empresa.io",
    orderId: "ORD-3020",
    product: "Actualización de equipo",
    status: "Procesando",
    amount: "$499.00",
  },
  {
    initials: "PS",
    name: "Priya Sharma",
    email: "priya@startup.co",
    orderId: "ORD-3019",
    product: "Licencia Empresarial",
    status: "Completado",
    amount: "$1,299.00",
  },
  {
    initials: "DO",
    name: "Daniel Osei",
    email: "daniel@dev.com",
    orderId: "ORD-3018",
    product: "Licencia individual",
    status: "Pendiente",
    amount: "$69.00",
  },
  {
    initials: "WZ",
    name: "Wei Zhang",
    email: "wei@agencia.co",
    orderId: "ORD-3017",
    product: "Plan Profesional",
    status: "Completado",
    amount: "$249.00",
  },
  {
    initials: "SN",
    name: "Sofie Novak",
    email: "sofie@tech.io",
    orderId: "ORD-3016",
    product: "Actualización de equipo",
    status: "Cancelado",
    amount: "$499.00",
  },
]

export type ActivityItem = {
  title: string
  description: string
  time: string
}

export const recentActivity: ActivityItem[] = [
  {
    title: "Nueva orden recibida",
    description: "Laura Fernández compró el Plan Profesional",
    time: "hace 4 min",
  },
  {
    title: "Nuevo cliente registrado",
    description: "Marco Rossi creó una cuenta",
    time: "hace 22 min",
  },
  {
    title: "Reseña de 5 estrellas",
    description: "\"Justo lo que necesitaba, excelente soporte.\"",
    time: "hace 1 hora",
  },
  {
    title: "Pago recibido",
    description: "$1,299.00 de Priya Sharma",
    time: "hace 3 horas",
  },
  {
    title: "Ticket de soporte resuelto",
    description: "Ticket #2187 marcado como resuelto",
    time: "hace 5 horas",
  },
  {
    title: "Nueva orden recibida",
    description: "Daniel Osei compró la Licencia individual",
    time: "hace 7 horas",
  },
]
