import { useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { fmtDateRange, NIVEAUX_OFFICIELS, posteCreneauLabel, posteCreneauKey } from "../lib/format";

export default function SignupModal({
  event,
  form,
  postes,
  adherents,
  onClose,
  heading = "Je me porte bénévole",
  showNiveauOfficiel = false,
}) {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [metier, setMetier] = useState("");
  const [posteIds, setPosteIds] = useState([]);
  const [niveauxOfficiels, setNiveauxOfficiels] = useState([]);
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

  function toggleNiveau(niveau) {
    setNiveauxOfficiels((prev) =>
      prev.includes(niveau) ? prev.filter((x) => x !== niveau) : [...prev, niveau]
    );
  }

  function togglePoste(poste) {
    setPosteIds((prev) => {
      if (prev.includes(poste.id)) {
        return prev.filter((x) => x !== poste.id);
      }
      // Un seul poste par créneau (même jour + même moment) : on retire
      // d'abord tout autre poste déjà choisi sur ce même créneau.
      const key = posteCreneauKey(poste);
      const withoutSameCreneau = prev.filter((id) => {
        const other = postes.find((x) => x.id === id);
        return !other || posteCreneauKey(other) !== key;
      });
      return [...withoutSameCreneau, poste.id];
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (postes.length && posteIds.length === 0) {
      setError("Choisissez au moins un poste (vous pouvez en cocher plusieurs).");
      return;
    }
    const stillFull = posteIds.some((id) => {
      const p = postes.find((x) => x.id === id);
      return p && p.places_restantes <= 0;
    });
    if (stillFull) {
      setError("Un des postes choisis vient d'être complété par quelqu'un d'autre — décochez-le et réessayez.");
      return;
    }

    setSubmitting(true);
    const baseRow = {
      formulaire_id: form.id,
      nom,
      prenom,
      telephone,
      email,
      metier_competence: metier,
      niveau_officiel: niveauxOfficiels.length ? niveauxOfficiels.join(", ") : null,
      adherent_id: adherentId || null,
    };
    const rows = postes.length ? posteIds.map((pid) => ({ ...baseRow, poste_id: pid })) : [{ ...baseRow, poste_id: null }];
    const { error: insertError } = await supabase.from("inscriptions_benevoles").insert(rows);
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
            <h3>{heading}</h3>
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
            <h3>{heading}</h3>
            <p className="modal-sub">
              {event.titre} &middot; {fmtDateRange(event.date, event.date_fin)}
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
              {showNiveauOfficiel && (
                <div className="field">
                  <label>Niveau officiel (vous pouvez en cocher plusieurs)</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {NIVEAUX_OFFICIELS.map((n) => (
                      <label key={n} className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={niveauxOfficiels.includes(n)}
                          onChange={() => toggleNiveau(n)}
                        />
                        {n}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {postes.length > 0 && (
                <div className="field">
                  <label>Poste(s) souhaité(s) * — un seul par créneau (vous pouvez en choisir un le matin, un l'après-midi, un le soir…)</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {postes.map((p) => {
                      const creneau = posteCreneauLabel(p);
                      const full = p.places_restantes <= 0;
                      const label = creneau ? `${creneau} — ${p.nom}` : p.nom;
                      return (
                        <label key={p.id} className="checkbox-row" style={{ opacity: full ? 0.55 : 1 }}>
                          <input
                            type="checkbox"
                            checked={posteIds.includes(p.id)}
                            disabled={full}
                            onChange={() => togglePoste(p)}
                          />
                          {label}{" "}
                          <span className="muted" style={{ fontSize: ".78rem" }}>
                            (
                            {full
                              ? "complet"
                              : `${p.places_restantes} place${p.places_restantes > 1 ? "s" : ""} restante${
                                  p.places_restantes > 1 ? "s" : ""
                                }`}
                            )
                          </span>
                        </label>
                      );
                    })}
                  </div>
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
