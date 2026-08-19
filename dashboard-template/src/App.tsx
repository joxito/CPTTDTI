import { Routes, Route } from "react-router-dom"

import { AppLayout } from "@/components/layout/app-layout"
import DashboardPage from "@/pages/dashboard"
import CustomersPage from "@/pages/customers"
import HistoryPage from "@/pages/history"
import SettingsPage from "@/pages/settings"
import ServiceRequestPage from "@/pages/service-request"

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/solicitud-servicios" element={<ServiceRequestPage />} />
        <Route path="/historial" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route
        path="/solicitud-servicios/publico"
        element={<ServiceRequestPage standalone />}
      />
    </Routes>
  )
}
