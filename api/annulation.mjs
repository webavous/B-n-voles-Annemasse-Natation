// Fonction Vercel (serverless) utilisée par la page publique "Annuler mon
// inscription" (src/pages/Annulation.jsx). On passe ici par la clé
// "service_role" de Supabase (uniquement côté serveur, jamais exposée au
// navigateur) plutôt que par la clé publique utilisée ailleurs sur le site :
// ça évite d'avoir à ouvrir aux visiteurs un droit de lecture/suppression
// large sur la table des inscriptions (qui contient emails/téléphones de
// tout le monde), tout en permettant à chacun d'annuler SA PROPRE
// inscription via le lien reçu par email.
//
// Nécessite une variable d'environnement supplémentaire sur Vercel :
//   - SUPABASE_SERVICE_ROLE_KEY : la clé "service_role" (secrète) du
//     projet Supabase — Supabase → Project Settings → API → Project API
//     keys → "service_role".
// Réutilise VITE_SUPABASE_URL, déjà configurée pour le reste du site.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb(path, options = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    res.status(500).json({ error: "Configuration manquante (SUPABASE_SERVICE_ROLE_KEY)." });
    return;
  }

  const id = req.method === "GET" ? req.query.id : (req.body || {}).id;
  if (!id) {
    res.status(400).json({ error: "Identifiant manquant." });
    return;
  }

  if (req.method === "GET") {
    const inscRes = await sb(`inscriptions_benevoles?id=eq.${id}&select=*`);
    const inscData = await inscRes.json();
    const insc = inscRes.ok && Array.isArray(inscData) ? inscData[0] : null;
    if (!insc) {
      res.status(404).json({ error: "Introuvable." });
      return;
    }

    let eventTitre = null;
    let eventDate = null;
    let eventDateFin = null;
    if (insc.formulaire_id) {
      const formRes = await sb(`formulaires_benevolat?id=eq.${insc.formulaire_id}&select=*`);
      const formData = await formRes.json();
      const form = Array.isArray(formData) ? formData[0] : null;
      if (form?.evenement_id) {
        const evRes = await sb(`evenements?id=eq.${form.evenement_id}&select=*`);
        const evData = await evRes.json();
        const ev = Array.isArray(evData) ? evData[0] : null;
        if (ev) {
          eventTitre = ev.titre;
          eventDate = ev.date;
          eventDateFin = ev.date_fin;
        }
      }
    }

    res.status(200).json({
      prenom: insc.prenom,
      nom: insc.nom,
      eventTitre,
      eventDate,
      eventDateFin,
    });
    return;
  }

  if (req.method === "POST") {
    const delRes = await sb(`inscriptions_benevoles?id=eq.${id}`, { method: "DELETE" });
    if (!delRes.ok) {
      res.status(502).json({ error: "Échec de la suppression." });
      return;
    }
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: "Méthode non autorisée." });
}
