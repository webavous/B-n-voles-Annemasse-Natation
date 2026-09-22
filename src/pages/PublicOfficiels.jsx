import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { fmtDateRange, fmtDay, fmtMonth, isPast, momentRank } from "../lib/format";
import SignupModal from "../components/SignupModal.jsx";
import Brand from "../components/Brand.jsx";

// Onglet public dédié aux officiels de compétition départementale
// (chronométreurs, juges de virage, starters…). Ne montre que les
// événements marqués « Officiels compétition départementale » depuis
// l'espace admin — le lien de cette page est fait pour être collé
// directement dans les convocations envoyées aux parents officiels.
export default function PublicOfficiels() {
  const [events, setEvents] = useState([]);
  const [forms, setForms] = useState({}); // evenement_id -> formulaire
  const [postesDispo, setPostesDispo] = useState([]); // v_postes_disponibilite rows
  const [adherents, setAdherents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signupEvent, setSignupEvent] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const [{ data: evs }, { data: fs }, { data: pd }, { data: ads }] = await Promise.all([
      supabase.from("evenements").select("*").eq("visible", true).order("date", { ascending: true }),
      supabase.from("formulaires_benevolat").select("*"),
      supabase.from("v_postes_disponibilite").select("*"),
      supabase.from("adherents").select("*").order("groupe").order("nom"),
    ]);
    setEvents((evs || []).filter((e) => e.categorie === "officiels"));
    const formMap = {};
    (fs || []).forEach((f) => (formMap[f.evenement_id] = f));
    setForms(formMap);
    setPostesDispo(pd || []);
    setAdherents(ads || []);
    setLoading(false);
  }

  function postesFor(formulaireId) {
    return postesDispo
      .filter((p) => p.formulaire_id === formulaireId)
      .slice()
      .sort((a, b) => {
        const d = (a.date || "").localeCompare(b.date || "");
        if (d !== 0) return d;
        return momentRank(a.moment) - momentRank(b.moment);
      });
  }

  function hasAvailability(formulaireId) {
    const postes = postesFor(formulaireId);
    if (!postes.length) return true;
    return postes.some((p) => p.places_restantes > 0);
  }

  return (
    <div>
      <div className="topbar">
        <div className="topbar-inner">
          <Brand subtitle="Officiels compétition départementale" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link to="/" className="btn btn-ghost btn-sm">
              Calendrier bénévolat
            </Link>
            <Link to="/admin" className="btn btn-ghost btn-sm">
              Espace admin
            </Link>
          </div>
        </div>
      </div>

      <main>
        <div className="wrap">
          <div className="hero">
            <h2>Officiels compétition départementale</h2>
            <p>
              Vous avez été convoqué·e comme officiel (chronométreur, juge de virage, starter…) pour une compétition
              départementale ? Retrouvez ci-dessous la compétition concernée et inscrivez-vous directement.
            </p>
          </div>

          {loading ? (
            <p className="muted">Chargement…</p>
          ) : !events.length ? (
            <div className="empty-state">Aucune compétition départementale publiée pour le moment.</div>
          ) : (
            <div className="event-list">
              {events.map((ev) => {
                const form = forms[ev.id];
                const postes = form ? postesFor(form.id) : [];
                const past = isPast(ev.date);
                const open = !past && form && form.statut === "ouvert";
                const available = open && hasAvailability(form.id);

                return (
                  <div className="event-card" key={ev.id}>
                    <div className="event-card-main">
                      <div className="event-date">
                        <span className="day mono">{fmtDay(ev.date)}</span>
                        <span className="month">{fmtMonth(ev.date)}</span>
                      </div>
                      <div className="event-body">
                        <h3>{ev.titre}</h3>
                        <div className="event-meta">
                          {fmtDateRange(ev.date, ev.date_fin)}
                          {ev.lieu ? ` · ${ev.lieu}` : ""}
                        </div>
                        {ev.description && <div className="event-desc">{ev.description}</div>}
                      </div>
                      <div className="event-side">
                        {past ? (
                          <span className="badge badge-past">Terminé</span>
                        ) : available ? (
                          <button className="badge badge-open" onClick={() => setSignupEvent(ev)}>
                            <span className="dot" /> Inscription officiel ouverte
                          </button>
                        ) : open ? (
                          <span className="badge badge-closed">Tous les postes sont complets</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <footer>Annemasse Natation</footer>

      {signupEvent && (
        <SignupModal
          event={signupEvent}
          form={forms[signupEvent.id]}
          postes={postesFor(forms[signupEvent.id]?.id)}
          adherents={adherents}
          heading="Je m'inscris comme officiel"
          onClose={() => {
            setSignupEvent(null);
            loadAll();
          }}
        />
      )}
    </div>
  );
}
