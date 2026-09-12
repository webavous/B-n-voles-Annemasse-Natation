import { useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { fmtDateLong } from "../lib/format";

export default function SignupModal({ event, form, postes, adherents, onClose }) {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [metier, setMetier] = useState("");
  const [posteId, setPosteId] = useState("");
  const [adherentId, setAdherentId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const adherentsByGroupe = useMemo(() => {
    const map = {};
    (adherents || []).forEach((a) => {
      const g = a.groupe || "Autre";
      (map[g] = map[g] || []).push(a);
    });
    return map;
  }, [adherents]);

  const anyAvailable = !postes.length || postes.some((p) => p.places_restantes > 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const selectedPoste = postes.find((p) => p.id === posteId);
    if (postes.length && selectedPoste && selectedPoste.places_restantes <= 0) {
      setError("Ce poste vient d'être complété par quelqu'un d'autre — choisissez-en un autre.");
      return;
    }

    setSubmitting(true);
    const adherent = (adherents || []).find((a) => a.id === adherentId);
    const { error: insertError } = await supabase.from("inscriptions_benevoles").insert({
      formulaire_id: form.id,
      poste_id: posteId || null,
      nom,
      prenom,
      telephone,
      email,
      metier_competence: metier,
      adherent_id: adherentId || null,
    });
    setSubmitting(false);

    if (insertError) {
      setError(
        insertError.message.includes("complet")
          ? "Ce poste vient d'être complété par quelqu'un d'autre — choisissez-en un autre."
          : "L'inscription n'a pas pu être enregistrée, réessayez."
      );
      return;
    }
    setDone(true);
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose} aria-label="Fermer">
          &times;
        </button>

        {done ? (
          <>
            <h3>Merci !</h3>
            <p className="modal-sub">
              Votre inscription pour « {event.titre} » a bien été enregistrée. Le club vous recontactera si besoin.
            </p>
            <button className="btn btn-primary" onClick={onClose}>
              Fermer
            </button>
          </>
        ) : postes.length && !anyAvailable ? (
          <>
            <h3>Je me porte bénévole</h3>
            <p className="modal-sub">{event.titre}</p>
            <p>
              Tous les postes sont complets pour cet événement — merci de votre intérêt, n'hésitez pas à revenir
              pour un prochain événement !
            </p>
            <button className="btn btn-primary" onClick={onClose}>
              Fermer
            </button>
          </>
        ) : (
          <>
            <h3>Je me porte bénévole</h3>
            <p className="modal-sub">
              {event.titre} &middot; {fmtDateLong(event.date)}
              {form.besoins ? <><br />{form.besoins}</> : null}
            </p>
            <form onSubmit={handleSubmit}>
              <div className="field-row">
                <div className="field">
                  <label>Nom *</label>
                  <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} required />
                </div>
                <div className="field">
                  <label>Prénom *</label>
                  <input type="text" value={prenom} onChange={(e) => setPrenom(e.target.value)} required />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Téléphone</label>
                  <input
                    type="tel"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    placeholder="06 12 34 56 78"
                  />
                </div>
                <div className="field">
                  <label>Email *</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>
              <div className="field">
                <label>Métier / compétence</label>
                <input
                  type="text"
                  value={metier}
                  onChange={(e) => setMetier(e.target.value)}
                  placeholder="Ex. infirmier, comptable, chronométreur…"
                />
              </div>
              {postes.length > 0 && (
                <div className="field">
                  <label>Poste souhaité *</label>
                  <select value={posteId} onChange={(e) => setPosteId(e.target.value)} required>
                    <option value="">— Choisir un poste —</option>
                    {postes.map((p) => (
                      <option key={p.id} value={p.id} disabled={p.places_restantes <= 0}>
                        {p.nom} (
                        {p.places_restantes <= 0
                          ? "complet"
                          : `${p.places_restantes} place${p.places_restantes > 1 ? "s" : ""} restante${
                              p.places_restantes > 1 ? "s" : ""
                            }`}
                        )
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="field">
                <label>Se rattacher à un adhérent du club</label>
                <select value={adherentId} onChange={(e) => setAdherentId(e.target.value)}>
                  <option value="">— Sélectionner (facultatif) —</option>
                  {Object.entries(adherentsByGroupe).map(([groupe, list]) => (
                    <optgroup key={groupe} label={groupe}>
                      {list.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.prenom} {a.nom}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              {error && <p className="error-text">{error}</p>}
              <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: 6 }} disabled={submitting}>
                {submitting ? "Envoi…" : "Envoyer mon inscription"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
