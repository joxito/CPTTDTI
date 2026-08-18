import { Routes, Route } from "react-router-dom"

import { AppLayout } from "@/components/layout/app-layout"
import DashboardPage from "@/pages/dashboard"
import OrdersPage from "@/pages/orders"
import CustomersPage from "@/pages/customers"
import AnalyticsPage from "@/pages/analytics"
import ProductsPage from "@/pages/products"
import SettingsPage from "@/pages/settings"

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
