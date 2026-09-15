import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabaseClient";

export default function AdminRecap() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [{ data: insc }, { data: pres }, { data: evs }, { data: ads }] = await Promise.all([
      supabase.from("inscriptions_benevoles").select("*"),
      supabase.from("presences").select("*").eq("present", true),
      supabase.from("evenements").select("id, titre"),
      supabase.from("adherents").select("*"),
    ]);

    const eventsById = {};
    (evs || []).forEach((e) => (eventsById[e.id] = e));
    const inscById = {};
    (insc || []).forEach((i) => (inscById[i.id] = i));
    const adherentsById = {};
    (ads || []).forEach((a) => (adherentsById[a.id] = a));

    // On doit retrouver l'événement de chaque inscription via son formulaire ;
    // formulaire_id -> evenement_id nécessite un second aller-retour.
    const { data: forms } = await supabase.from("formulaires_benevolat").select("id, evenement_id");
    const eventIdByFormId = {};
    (forms || []).forEach((f) => (eventIdByFormId[f.id] = f.evenement_id));

    const byKey = {};
    (pres || []).forEach((p) => {
      const insc2 = inscById[p.inscription_id];
      if (!insc2) return;
      const eventId = eventIdByFormId[insc2.formulaire_id];
      const ev = eventsById[eventId];
      const adherent = adherentsById[insc2.adherent_id];
      const key = insc2.adherent_id || `${insc2.nom}|${insc2.prenom}|${insc2.email}`;
      if (!byKey[key]) {
        byKey[key] = {
          nom: insc2.nom,
          prenom: insc2.prenom,
          groupe: adherent?.groupe || "—",
          rattacheA: adherent ? `${adherent.prenom} ${adherent.nom}` : "—",
          count: 0,
          events: [],
        };
      }
      byKey[key].count += 1;
      byKey[key].events.push(ev ? ev.titre : "Événement");
    });

    setRows(Object.values(byKey).sort((a, b) => b.count - a.count));
    setLoading(false);
  }

  function handleExport() {
    const data = rows.map((r) => ({
      "Bénévole": `${r.prenom} ${r.nom}`,
      "Rattaché à": r.rattacheA,
      Groupe: r.groupe,
      "Nb. événements": r.count,
      "Détail des événements": r.events.join(", "),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 24 }, { wch: 24 }, { wch: 22 }, { wch: 14 }, { wch: 60 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Récapitulatif");
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `recap-benevoles-${today}.xlsx`);
  }

  if (loading) return <p className="muted">Chargement…</p>;

  return (
    <div>
      <div className="section-title">
        <h2>Récapitulatif des bénévoles</h2>
        <button className="btn btn-primary btn-sm" onClick={handleExport} disabled={!rows.length}>
          Exporter en Excel
        </button>
      </div>
      <p className="muted" style={{ marginTop: -6 }}>
        Basé sur les présences pointées sur chaque événement. À consulter en fin de saison.
      </p>

      {!rows.length ? (
        <div className="empty-state">
          Aucune présence enregistrée pour le moment. Pointez les présences depuis l'onglet Calendrier une fois un
          événement passé.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Bénévole</th>
                <th>Rattaché à</th>
                <th>Groupe</th>
                <th>Nb. événements</th>
                <th>Détail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx}>
                  <td>
                    {r.prenom} {r.nom}
                  </td>
                  <td>{r.rattacheA}</td>
                  <td>
                    <span className="pill pill-group">{r.groupe}</span>
                  </td>
                  <td className="mono">{r.count}</td>
                  <td className="muted" style={{ fontSize: ".82rem" }}>
                    {r.events.join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
