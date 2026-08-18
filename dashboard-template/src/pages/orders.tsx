import { ShoppingCart } from "lucide-react"

import { PlaceholderPage } from "@/components/layout/placeholder-page"

export default function OrdersPage() {
  return (
    <PlaceholderPage
      title="Órdenes"
      description="Gestioná y seguí todas las órdenes de tu negocio."
      icon={ShoppingCart}
    />
  )
}
