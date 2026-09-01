import * as React from "react"
import type { Session } from "@supabase/supabase-js"

import { supabase } from "@/lib/supabase"

export const CREATOR_EMAIL = "cptt@ipl.edu.do"

const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000
const LOGIN_AT_KEY = "cpttl_login_at"

export type StaffProfile = {
  id: string
  name: string
  role: "administrador" | "editor"
  photo: string | null
  signature: string | null
}

type AuthContextValue = {
  session: Session | null
  staffProfile: StaffProfile | null
  isCreator: boolean
  loading: boolean
  signOut: () => Promise<void>
  refreshStaffProfile: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null)
  const [staffProfile, setStaffProfile] = React.useState<StaffProfile | null>(null)
  const [loading, setLoading] = React.useState(true)

  const signOut = React.useCallback(async () => {
    localStorage.removeItem(LOGIN_AT_KEY)
    await supabase.auth.signOut()
  }, [])

  const loadStaffProfile = React.useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("staff")
      .select("id, name, role, photo, signature")
      .eq("id", userId)
      .maybeSingle()
    setStaffProfile(data)
  }, [])

  const refreshStaffProfile = React.useCallback(async () => {
    if (session) await loadStaffProfile(session.user.id)
  }, [session, loadStaffProfile])

  React.useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      if (data.session) loadStaffProfile(data.session.user.id)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession)

        if (event === "SIGNED_IN") {
          localStorage.setItem(LOGIN_AT_KEY, String(Date.now()))
        }

        if (event === "SIGNED_OUT") {
          localStorage.removeItem(LOGIN_AT_KEY)
          setStaffProfile(null)
          return
        }

        if (newSession) loadStaffProfile(newSession.user.id)
      }
    )

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [loadStaffProfile])

  React.useEffect(() => {
    function checkSessionAge() {
      const loginAt = Number(localStorage.getItem(LOGIN_AT_KEY))
      if (loginAt && Date.now() - loginAt > SESSION_MAX_AGE_MS) {
        signOut()
      }
    }

    checkSessionAge()
    const interval = setInterval(checkSessionAge, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [signOut])

  const isCreator = session?.user.email === CREATOR_EMAIL

  return (
    <AuthContext.Provider
      value={{ session, staffProfile, isCreator, loading, signOut, refreshStaffProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = React.useContext(AuthContext)

  if (context === undefined)
    throw new Error("useAuth must be used within an AuthProvider")

  return context
}
