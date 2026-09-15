import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { fmtDateRange, MOMENTS, momentRank, posteCreneauLabel } from "../lib/format";

export default function AdminCalendrier() {
  const [events, setEvents] = useState([]);
  const [forms, setForms] = useState({}); // evenement_id -> formulaire
  const [postes, setPostes] = useState([]); // all postes_benevolat
  const [inscriptions, setInscriptions] = useState([]);
  const [presences, setPresences] = useState({}); // inscription_id -> presence row
  const [adherents, setAdherents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  // silent = true : on recharge les données sans remplacer toute la page par
  // "Chargement…" — utile après une petite action (cocher une présence, par
  // exemple) pour ne pas faire disparaître/réapparaître la liste et donc ne
  // pas faire remonter la page en haut de l'écran.
  async function loadAll({ silent = false } = {}) {
    if (!silent) setLoading(true);
    const [{ data: evs }, { data: fs }, { data: ps }, { data: insc }, { data: pres }, { data: ads }] = await Promise.all([
      supabase.from("evenements").select("*").order("date", { ascending: true }),
      supabase.from("formulaires_benevolat").select("*"),
      supabase.from("postes_benevolat").select("*"),
      supabase.from("inscriptions_benevoles").select("*"),
      supabase.from("presences").select("*"),
      supabase.from("adherents").select("*"),
    ]);
    setEvents(evs || []);
    const formMap = {};
    (fs || []).forEach((f) => (formMap[f.evenement_id] = f));
    setForms(formMap);
    setPostes(ps || []);
    setInscriptions(insc || []);
    const presMap = {};
    (pres || []).forEach((p) => (presMap[p.inscription_id] = p));
    setPresences(presMap);
    setAdherents(ads || []);
    if (!silent) setLoading(false);
  }

  function postesFor(formulaireId) {
    return postes
      .filter((p) => p.formulaire_id === formulaireId)
      .slice()
      .sort((a, b) => {
        const d = (a.date || "").localeCompare(b.date || "");
        if (d !== 0) return d;
        return momentRank(a.moment) - momentRank(b.moment);
      });
  }
  function inscriptionsFor(formulaireId) {
    return inscriptions.filter((i) => i.formulaire_id === formulaireId);
  }
  function taken(posteId) {
    return inscriptions.filter((i) => i.poste_id === posteId).length;
  }

  async function handleCreateEvent(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const { error } = await supabase.from("evenements").insert({
      titre: fd.get("titre"),
      date: fd.get("date"),
      date_fin: fd.get("date_fin") || null,
      lieu: fd.get("lieu"),
      description: fd.get("description"),
      visible: true,
    });
    if (error) { showToast("Échec de la création."); return; }
    e.target.reset();
    setNewEventOpen(false);
    showToast("Événement créé.");
    loadAll({ silent: true });
  }

  async function handleEditEvent(e, eventId) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const { error } = await supabase
      .from("evenements")
      .update({
        titre: fd.get("titre"),
        date: fd.get("date"),
        date_fin: fd.get("date_fin") || null,
        lieu: fd.get("lieu"),
        description: fd.get("description"),
        visible: fd.get("visible") === "on",
      })
      .eq("id", eventId);
    if (error) { showToast("Échec de la mise à jour."); return; }
    showToast("Événement mis à jour.");
    loadAll({ silent: true });
  }

  async function handleDeleteEvent(eventId) {
    await supabase.from("evenements").delete().eq("id", eventId);
    setExpandedId(null);
    showToast("Événement supprimé.");
    loadAll({ silent: true });
  }

  async function handleCreateForm(eventId) {
    const { error } = await supabase.from("formulaires_benevolat").insert({ evenement_id: eventId, statut: "ferme" });
    if (error) { showToast("Échec de la création du formulaire."); return; }
    showToast("Formulaire créé.");
    loadAll({ silent: true });
  }

  async function handleToggleForm(form) {
    await supabase
      .from("formulaires_benevolat")
      .update({ statut: form.statut === "ouvert" ? "ferme" : "ouvert" })
      .eq("id", form.id);
    showToast(form.statut === "ouvert" ? "Inscriptions fermées." : "Inscriptions ouvertes !");
    loadAll({ silent: true });
  }

  async function handleSaveBesoins(e, form) {
    e.preventDefault();
    const fd = new FormData(e.target);
    await supabase.from("formulaires_benevolat").update({ besoins: fd.get("besoins") }).eq("id", form.id);
    showToast("Notes enregistrées.");
    loadAll({ silent: true });
  }

  async function handleAddPoste(e, formId) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const places = parseInt(fd.get("places"), 10);
    if (!fd.get("nom") || !places || places < 1) {
      showToast("Indiquez un nom de poste et un nombre de places valide.");
      return;
    }
    const { error } = await supabase.from("postes_benevolat").insert({
      formulaire_id: formId,
      nom: fd.get("nom"),
      places_totales: places,
      date: fd.get("date") || null,
      moment: fd.get("moment") || null,
    });
    if (error) { showToast("Échec de l'ajout du poste."); return; }
    e.target.reset();
    showToast("Poste ajouté.");
    loadAll({ silent: true });
  }

  async function handleDeletePoste(posteId) {
    await supabase.from("postes_benevolat").delete().eq("id", posteId);
    showToast("Poste supprimé.");
    loadAll({ silent: true });
  }

  async function handleTogglePresence(inscriptionId, checked) {
    const existing = presences[inscriptionId];
    if (existing) {
      await supabase
        .from("presences")
        .update({ present: checked, date_pointage: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("presences")
        .insert({ inscription_id: inscriptionId, present: checked, date_pointage: new Date().toISOString() });
    }
    loadAll({ silent: true });
  }

  if (loading) return <p className="muted">Chargement…</p>;

  return (
    <div>
      <div className="section-title">
        <h2>Événements de la saison</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setNewEventOpen((v) => !v)}>
          {newEventOpen ? "Annuler" : "+ Nouvel événement"}
        </button>
      </div>

      {newEventOpen && (
        <div className="card" style={{ marginBottom: 16 }}>
          <form onSubmit={handleCreateEvent}>
            <div className="field-row">
              <div className="field">
                <label>Titre *</label>
                <input type="text" name="titre" required placeholder="Ex. Interclub" />
              </div>
              <div className="field">
                <label>Date de début *</label>
                <input type="date" name="date" required />
              </div>
            </div>
            <div className="field">
              <label>Date de fin (si l'événement dure plusieurs jours)</label>
              <input type="date" name="date_fin" />
            </div>
            <div className="field">
              <label>Lieu</label>
              <input type="text" name="lieu" placeholder="Piscine des Grands Bois, Annemasse" />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea name="description" placeholder="Quelques mots sur l'événement, visibles par les adhérents" />
            </div>
            <button type="submit" className="btn btn-primary">
              Créer l'événement
            </button>
          </form>
        </div>
      )}

      {!events.length && <div className="empty-state">Aucun événement pour l'instant.</div>}

      {events.map((ev) => {
        const open = expandedId === ev.id;
        const form = forms[ev.id];
        const insc = form ? inscriptionsFor(form.id) : [];
        const eventPostes = form ? postesFor(form.id) : [];
        const presentCount = insc.filter((i) => presences[i.id]?.present).length;

        return (
          <div className="admin-event-row" key={ev.id}>
            <button className="admin-event-head" onClick={() => setExpandedId(open ? null : ev.id)}>
              <div className="grow">
                <h3>
                  {ev.titre}
                  {ev.visible === false && <span className="muted" style={{ fontSize: ".75rem" }}> (masqué)</span>}
                </h3>
                <div className="sub">
                  {fmtDateRange(ev.date, ev.date_fin)}
                  {ev.lieu ? ` · ${ev.lieu}` : ""}
                </div>
              </div>
              {form && (
                <span className={`badge ${form.statut === "ouvert" ? "badge-open" : "badge-closed"}`}>
                  {form.statut === "ouvert" ? "Bénévolat ouvert" : "Bénévolat fermé"}
                </span>
              )}
              {insc.length > 0 && (
                <span className="pill pill-group">
                  {presentCount}/{insc.length} présents
                </span>
              )}
            </button>

            {open && (
              <div className="admin-event-detail">
                <div className="subblock">
                  <div className="subblock-title">Détails de l'événement</div>
                  <form onSubmit={(e) => handleEditEvent(e, ev.id)}>
                    <div className="field-row">
                      <div className="field">
                        <label>Titre</label>
                        <input type="text" name="titre" defaultValue={ev.titre} />
                      </div>
                      <div className="field">
                        <label>Date de début</label>
                        <input type="date" name="date" defaultValue={ev.date} />
                      </div>
                    </div>
                    <div className="field">
                      <label>Date de fin (si plusieurs jours)</label>
                      <input type="date" name="date_fin" defaultValue={ev.date_fin || ""} />
                    </div>
                    <div className="field">
                      <label>Lieu</label>
                      <input type="text" name="lieu" defaultValue={ev.lieu || ""} />
                    </div>
                    <div className="field">
                      <label>Description</label>
                      <textarea name="description" defaultValue={ev.description || ""} />
                    </div>
                    <label className="checkbox-row" style={{ marginBottom: 12 }}>
                      <input type="checkbox" name="visible" defaultChecked={ev.visible !== false} /> Visible sur la
                      page publique
                    </label>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="submit" className="btn btn-primary btn-sm">
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteEvent(ev.id)}
                      >
                        Supprimer l'événement
                      </button>
                    </div>
                  </form>
                </div>

                <div className="subblock">
                  <div className="subblock-title">Formulaire bénévole</div>
                  {!form ? (
                    <button className="btn btn-ghost btn-sm" onClick={() => handleCreateForm(ev.id)}>
                      Créer le formulaire bénévole pour cet événement
                    </button>
                  ) : (
                    <>
                      <form onSubmit={(e) => handleSaveBesoins(e, form)}>
                        <div className="field">
                          <label>Notes complémentaires (optionnel)</label>
                          <textarea name="besoins" defaultValue={form.besoins || ""} placeholder="Toute précision utile pour les bénévoles" />
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <button type="submit" className="btn btn-ghost btn-sm">
                            Enregistrer
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${form.statut === "ouvert" ? "btn-danger" : "btn-primary"}`}
                            onClick={() => handleToggleForm(form)}
                          >
                            {form.statut === "ouvert" ? "Fermer les inscriptions" : "Ouvrir les inscriptions"}
                          </button>
                        </div>
                      </form>

                      <div style={{ marginTop: 16 }}>
                        <label style={{ marginBottom: 8 }}>Postes &amp; places nécessaires</label>
                        {ev.date_fin && (
                          <p className="muted" style={{ fontSize: ".8rem", margin: "0 0 10px" }}>
                            Cet événement dure plusieurs jours : indiquez pour chaque poste le jour et le moment
                            concernés (ex. « Chronométrage » le samedi matin, un autre poste le samedi après-midi…).
                          </p>
                        )}
                        {eventPostes.length > 0 && (
                          <div className="table-wrap" style={{ marginBottom: 10 }}>
                            <table>
                              <thead>
                                <tr>
                                  <th>Poste</th>
                                  <th>Créneau</th>
                                  <th>Places</th>
                                  <th></th>
                                </tr>
                              </thead>
                              <tbody>
                                {eventPostes.map((p) => {
                                  const t = taken(p.id);
                                  const full = t >= p.places_totales;
                                  const creneau = posteCreneauLabel(p);
                                  return (
                                    <tr key={p.id}>
                                      <td>{p.nom}</td>
                                      <td>{creneau || <span className="muted">—</span>}</td>
                                      <td className="mono">
                                        {t} / {p.places_totales}{" "}
                                        {full && (
                                          <span className="pill" style={{ background: "var(--badge-closed-bg)", color: "var(--badge-closed-text)" }}>
                                            complet
                                          </span>
                                        )}
                                      </td>
                                      <td>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleDeletePoste(p.id)}>
                                          Supprimer
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {!eventPostes.length && (
                          <p className="muted" style={{ fontSize: ".82rem", margin: "6px 0 10px" }}>
                            Aucun poste défini pour l'instant — sans poste, l'inscription reste ouverte sans limite de
                            places.
                          </p>
                        )}
                        <form
                          onSubmit={(e) => handleAddPoste(e, form.id)}
                          style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}
                        >
                          <div className="field" style={{ flex: 1, minWidth: 160, marginBottom: 0 }}>
                            <label>Nom du poste</label>
                            <input type="text" name="nom" required placeholder="Ex. Chronométrage" />
                          </div>
                          <div className="field" style={{ width: 150, marginBottom: 0 }}>
                            <label>Jour (optionnel)</label>
                            <input type="date" name="date" min={ev.date} max={ev.date_fin || ev.date} />
                          </div>
                          <div className="field" style={{ width: 160, marginBottom: 0 }}>
                            <label>Moment</label>
                            <select name="moment" defaultValue="Journée entière">
                              {MOMENTS.map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="field" style={{ width: 100, marginBottom: 0 }}>
                            <label>Places</label>
                            <input type="number" min="1" name="places" required placeholder="4" />
                          </div>
                          <button type="submit" className="btn btn-primary btn-sm">
                            Ajouter le poste
                          </button>
                        </form>
                      </div>
                    </>
                  )}
                </div>

                <div className="subblock">
                  <div className="subblock-title">Inscriptions &amp; présence ({insc.length})</div>
                  {!insc.length ? (
                    <p className="muted" style={{ fontSize: ".85rem" }}>
                      Aucune inscription pour cet événement.
                    </p>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Nom</th>
                            <th>Contact</th>
                            <th>Poste</th>
                            <th>Métier / compétence</th>
                            <th>Rattaché à</th>
                            <th>Présent</th>
                          </tr>
                        </thead>
                        <tbody>
                          {insc.map((i) => {
                            const poste = postes.find((p) => p.id === i.poste_id);
                            const creneau = poste ? posteCreneauLabel(poste) : "";
                            const pres = presences[i.id]?.present;
                            return (
                              <tr key={i.id}>
                                <td>
                                  {i.prenom} {i.nom}
                                </td>
                                <td className="mono" style={{ fontSize: ".78rem" }}>
                                  {i.telephone || "—"}
                                  <br />
                                  {i.email}
                                </td>
                                <td>
                                  {poste ? (
                                    <>
                                      <span className="pill pill-group">{poste.nom}</span>
                                      {creneau && (
                                        <div className="muted" style={{ fontSize: ".72rem", marginTop: 3 }}>
                                          {creneau}
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <span className="muted">—</span>
                                  )}
                                </td>
                                <td>{i.metier_competence || "—"}</td>
                                <td>
                                  {(() => {
                                    const a = adherents.find((x) => x.id === i.adherent_id);
                                    return a ? (
                                      <>
                                        {a.prenom} {a.nom}
                                        <br />
                                        <span className="pill pill-group">{a.groupe || "—"}</span>
                                      </>
                                    ) : (
                                      <span className="muted">—</span>
                                    );
                                  })()}
                                </td>
                                <td>
                                  <label className="checkbox-row">
                                    <input
                                      type="checkbox"
                                      checked={!!pres}
                                      onChange={(e) => handleTogglePresence(i.id, e.target.checked)}
                                    />
                                  </label>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
