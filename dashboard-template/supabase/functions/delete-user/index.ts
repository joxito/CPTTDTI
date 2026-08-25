// Edge Function: elimina un usuario de verdad (login + fila en staff), no
// solo la fila de staff. Sin esto, "eliminar" desde el panel solo borraba
// los metadatos pero la cuenta seguía pudiendo iniciar sesión. Mismo
// patrón que create-user: solo cptt@ipl.edu.do puede llamarla.
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
        JSON.stringify({ error: "Solo la cuenta creadora puede eliminar usuarios." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { userId } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Falta el id del usuario." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { data: target } = await adminClient
      .from("staff")
      .select("email")
      .eq("id", userId)
      .single()

    if (target?.email === CREATOR_EMAIL) {
      return new Response(
        JSON.stringify({ error: "La cuenta creadora no se puede eliminar." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Borra primero la fila de staff (por las dudas de que la eliminación
    // del login falle) y después el login real.
    await adminClient.from("staff").delete().eq("id", userId)

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)

    if (deleteError) {
      return new Response(
        JSON.stringify({ error: deleteError.message }),
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
