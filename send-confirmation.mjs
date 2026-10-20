// Fonction Vercel (serverless) qui envoie l'email de confirmation à une
// personne qui vient de s'inscrire (bénévolat ou officiel). Appelée depuis
// le site juste après l'enregistrement de l'inscription dans Supabase.
//
// Nécessite deux variables d'environnement sur Vercel :
//   - RESEND_API_KEY   : la clé API du compte Resend
//   - RESEND_FROM_EMAIL : l'adresse d'envoi, sur le domaine vérifié dans
//                         Resend (ex. "benevolat@votredomaine.fr")

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée." });
    return;
  }

  const { email, prenom, nom, eventTitre, eventDate, inscriptions, niveauOfficiel } = req.body || {};

  if (!email || !prenom || !eventTitre) {
    res.status(400).json({ error: "Champs manquants." });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    res.status(500).json({ error: "Configuration email manquante (RESEND_API_KEY / RESEND_FROM_EMAIL)." });
    return;
  }

  const ligneNiveau = niveauOfficiel
    ? `<p><strong>Niveau officiel déclaré :</strong> ${escapeHtml(niveauOfficiel)}</p>`
    : "";

  // Pour chaque inscription créée (un poste = une inscription), on affiche
  // le libellé du poste (s'il y en a un) suivi d'un lien pour que la
  // personne puisse elle-même annuler si elle devient indisponible — plus
  // besoin de passer par le club.
  const lignesInscriptions =
    Array.isArray(inscriptions) && inscriptions.length
      ? `<div style="margin: 14px 0;">
          <p style="margin:0 0 6px;"><strong>Poste(s) choisi(s) :</strong></p>
          ${inscriptions
            .map((insc) => {
              const label = insc.label ? escapeHtml(insc.label) : "Votre participation";
              const url = escapeHtml(insc.cancelUrl || "");
              return `<p style="margin:4px 0;">${label}${
                url ? ` — <a href="${url}" style="color:#c0392b;">Annuler cette inscription</a>` : ""
              }</p>`;
            })
            .join("")}
        </div>`
      : "";

  const html = `
    <div style="font-family: Arial, sans-serif; color:#1f2937; line-height:1.5; max-width: 480px;">
      <h2 style="margin:0 0 12px;">Merci ${escapeHtml(prenom)} !</h2>
      <p>Votre inscription pour « ${escapeHtml(eventTitre)} »${eventDate ? ` — ${escapeHtml(eventDate)}` : ""} a bien été enregistrée par Annemasse Natation.</p>
      ${lignesInscriptions}
      ${ligneNiveau}
      <p>Un empêchement de dernière minute ? Utilisez le lien ci-dessus pour annuler directement, c'est plus simple pour tout le monde.</p>
      <p>Merci pour votre engagement auprès du club !</p>
      <p style="color:#6b7280; font-size:13px; margin-top: 24px;">Annemasse Natation</p>
    </div>
  `;

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: `Inscription confirmée — ${eventTitre}`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const detail = await resendRes.text();
      res.status(502).json({ error: "Échec de l'envoi.", detail });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur lors de l'envoi." });
  }
}
