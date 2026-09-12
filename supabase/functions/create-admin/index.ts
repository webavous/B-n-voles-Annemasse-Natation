// Edge Function : create-admin
//
// Permet à un administrateur déjà connecté de créer directement un compte
// administrateur pour quelqu'un d'autre, avec l'email et un mot de passe
// provisoire choisis à la main (pas d'email d'invitation envoyé) — sans
// jamais exposer la clé service_role au navigateur (elle ne vit que côté
// serveur, ici).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Seules ces adresses email sont autorisées à créer de nouveaux comptes
// administrateurs. Pour ajouter ou retirer une personne, modifiez cette
// liste puis redéployez la fonction (Supabase > Edge Functions > create-admin).
const ALLOWED_CREATORS = [
  "hugo.annemassenatation@gmail.com",
  "vincent.annemassenatation@gmail.com",
];

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

    const callerEmail = caller.email?.toLowerCase().trim();
    if (!callerEmail || !ALLOWED_CREATORS.includes(callerEmail)) {
      return json({ error: "Vous n'êtes pas autorisé à créer de nouveaux comptes administrateurs." }, 403);
    }

    const body = await req.json().catch(() => null);
    const email = body?.email?.trim();
    const password = body?.password;

    if (!email || !password) {
      return json({ error: "Email et mot de passe requis." }, 400);
    }
    if (password.length < 6) {
      return json({ error: "Le mot de passe doit contenir au moins 6 caractères." }, 400);
    }

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
