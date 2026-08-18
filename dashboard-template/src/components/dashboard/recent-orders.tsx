import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { recentOrders, type OrderStatus } from "@/data/dashboard-data"
import { cn } from "@/lib/utils"

const statusVariant: Record<
  OrderStatus,
  "success" | "secondary" | "outline" | "destructive"
> = {
  Completado: "success",
  Procesando: "secondary",
  Pendiente: "outline",
  Cancelado: "destructive",
}

export function RecentOrders() {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>Órdenes recientes</CardTitle>
          <CardDescription>Últimas transacciones de tu tienda</CardDescription>
        </div>
        <CardAction>
          <Button variant="outline" size="sm">
            Ver todas
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="pb-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Orden</TableHead>
              <TableHead className="hidden sm:table-cell">Producto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentOrders.map((order) => (
              <TableRow key={order.orderId}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-[11px]">
                        {order.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {order.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {order.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {order.orderId}
                </TableCell>
                <TableCell className="hidden text-sm sm:table-cell">
                  {order.product}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={statusVariant[order.status]}
                    className={cn(
                      order.status === "Pendiente" && "text-muted-foreground"
                    )}
                  >
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {order.amount}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
