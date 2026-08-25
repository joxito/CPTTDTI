// Edge Function: restablece la contraseña de otro usuario. Requiere la
// service role key (nunca en el navegador). Solo la cuenta creadora
// puede llamarla — mismo patrón que create-user/delete-user.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CREATOR_EMAIL = "cptt@ipl.edu.do"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? ""

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const {
      data: { user: caller },
    } = await callerClient.auth.getUser()

    if (!caller || caller.email !== CREATOR_EMAIL) {
      return new Response(
        JSON.stringify({ error: "Solo la cuenta creadora puede restablecer contraseñas." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { userId, password } = await req.json()

    if (!userId || !password || password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Falta el usuario o la contraseña es muy corta." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      { password }
    )

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "No se pudo restablecer la contraseña." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error inesperado." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
