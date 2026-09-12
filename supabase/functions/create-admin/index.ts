// Edge Function : create-admin
//
// Permet à un administrateur déjà connecté de créer directement un compte
// administrateur pour quelqu'un d'autre, avec l'email et un mot de passe
// provisoire choisis à la main (pas d'email d'invitation envoyé) — sans
// jamais exposer la clé service_role au navigateur (elle ne vit que côté
// serveur, ici).
//
// Déploiement : Supabase Dashboard > Edge Functions > Deploy a new function,
// nommez-la "create-admin", collez ce fichier. SUPABASE_URL et
// SUPABASE_SERVICE_ROLE_KEY sont fournies automatiquement par Supabase à
// l'exécution, aucun secret à ajouter manuellement.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Non authentifié." }, 401);
    }

    // 1. Vérifie que l'appelant est bien un administrateur déjà connecté
    //    (on utilise sa propre session, avec la clé anon — pas la service_role).
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();

    if (callerError || !caller) {
      return json({ error: "Non authentifié." }, 401);
    }

    // 2. Récupère l'email et le mot de passe provisoire choisis
    const body = await req.json().catch(() => null);
    const email = body?.email?.trim();
    const password = body?.password;

    if (!email || !password) {
      return json({ error: "Email et mot de passe requis." }, 400);
    }
    if (password.length < 6) {
      return json({ error: "Le mot de passe doit contenir au moins 6 caractères." }, 400);
    }

    // 3. Crée le compte avec un client "admin" (clé service_role, jamais
    //    transmise au navigateur — elle n'existe que dans cette fonction,
    //    côté serveur Supabase). email_confirm: true active le compte tout
    //    de suite, sans email de confirmation à cliquer.
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      return json({ error: error.message }, 400);
    }

    return json({ success: true, userId: data.user?.id });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
