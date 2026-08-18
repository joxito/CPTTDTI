import { Routes, Route } from "react-router-dom"

import { AppLayout } from "@/components/layout/app-layout"
import DashboardPage from "@/pages/dashboard"
import OrdersPage from "@/pages/orders"
import CustomersPage from "@/pages/customers"
import AnalyticsPage from "@/pages/analytics"
import ProductsPage from "@/pages/products"
import SettingsPage from "@/pages/settings"
import ServiceRequestPage from "@/pages/service-request"

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/solicitud-servicios" element={<ServiceRequestPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
