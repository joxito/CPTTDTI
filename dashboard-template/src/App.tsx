import { Routes, Route } from "react-router-dom"

import { AppLayout } from "@/components/layout/app-layout"
import { RequireAuth } from "@/components/auth/require-auth"
import DashboardPage from "@/pages/dashboard"
import CustomersPage from "@/pages/customers"
import ServicesPage from "@/pages/services"
import HistoryPage from "@/pages/history"
import SettingsPage from "@/pages/settings"
import UsersPage from "@/pages/users"
import ServiceRequestPage from "@/pages/service-request"
import SatisfactionSurveyPage from "@/pages/satisfaction-survey"
import CompletionAgreementPage from "@/pages/completion-agreement"
import ActionAgreementPage from "@/pages/action-agreement"
import SignRequestPage from "@/pages/sign-request"
import LoginPage from "@/pages/login"

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/servicios" element={<ServicesPage />} />
          <Route path="/solicitud-servicios" element={<ServiceRequestPage />} />
          <Route
            path="/encuesta-satisfaccion"
            element={<SatisfactionSurveyPage />}
          />
          <Route
            path="/acuerdo-finalizacion"
            element={<CompletionAgreementPage />}
          />
          <Route
            path="/acuerdo-acciones"
            element={<ActionAgreementPage />}
          />
          <Route path="/historial" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/usuarios" element={<UsersPage />} />
        </Route>
      </Route>
      <Route
        path="/solicitud-servicios/publico"
        element={<ServiceRequestPage standalone />}
      />
      <Route
        path="/encuesta-satisfaccion/publico"
        element={<SatisfactionSurveyPage standalone />}
      />
      <Route
        path="/encuesta-satisfaccion/publico/:id"
        element={<SatisfactionSurveyPage standalone />}
      />
      <Route path="/firmar/:id" element={<SignRequestPage />} />
    </Routes>
  )
}
