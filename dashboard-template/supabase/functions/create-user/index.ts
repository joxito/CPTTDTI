// Edge Function: crea un usuario nuevo (login + fila en staff) de una sola
// vez. Requiere la service role key, así que corre acá, nunca en el
// navegador. Solo la cuenta creadora (cptt@ipl.edu.do) puede llamarla —
// se valida abajo con el JWT de quien llama, no solo confiando en la UI.
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

    // Cliente "de quien llama": valida su JWT contra la anon key para
    // confirmar quién es, sin permisos elevados.
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
        JSON.stringify({ error: "Solo la cuenta creadora puede agregar usuarios." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { email, name, role, password } = await req.json()

    if (!email || !name || !password || !["administrador", "editor"].includes(role)) {
      return new Response(
        JSON.stringify({ error: "Faltan datos o el rol no es válido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Cliente con permisos completos, solo para esta operación puntual.
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { data: created, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

    if (createError || !created.user) {
      return new Response(
        JSON.stringify({ error: createError?.message ?? "No se pudo crear el usuario." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { error: staffError } = await adminClient.from("staff").insert({
      id: created.user.id,
      email,
      name,
      role,
    })

    if (staffError) {
      // El login ya se creó pero la fila de staff falló: se deshace la
      // creación del login para no dejar una cuenta huérfana.
      await adminClient.auth.admin.deleteUser(created.user.id)
      return new Response(
        JSON.stringify({ error: staffError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    return new Response(JSON.stringify({ id: created.user.id }), {
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
