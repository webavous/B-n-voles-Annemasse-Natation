import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const GROUPES = ["Ecole de natation", "Benjamins", "Juniors", "Maîtres"];

export default function AdminAdherents() {
  const [adherents, setAdherents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    load();
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("adherents").select("*").order("groupe").order("nom");
    setAdherents(data || []);
    setLoading(false);
  }

  async function handleAdd(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const { error } = await supabase
      .from("adherents")
      .insert({ nom: fd.get("nom"), prenom: fd.get("prenom"), groupe: fd.get("groupe") });
    if (error) { showToast("Échec de l'ajout."); return; }
    e.target.reset();
    showToast("Adhérent ajouté.");
    load();
  }

  async function handleImport(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const lines = String(fd.get("csv") || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const rows = lines
      .map((line) => line.split(/[;,]/).map((p) => p.trim()))
      .filter((parts) => parts.length >= 2 && parts[0])
      .map((parts) => ({ nom: parts[0], prenom: parts[1] || "", groupe: parts[2] || "Autre" }));

    if (!rows.length) { showToast("Rien à importer."); return; }
    const { error } = await supabase.from("adherents").insert(rows);
    if (error) { showToast("Échec de l'import."); return; }
    e.target.reset();
    showToast(`${rows.length} adhérent(s) importé(s).`);
    load();
  }

  async function handleDelete(id) {
    await supabase.from("adherents").delete().eq("id", id);
    load();
  }

  if (loading) return <p className="muted">Chargement…</p>;

  return (
    <div>
      <div className="section-title">
        <h2>Adhérents du club ({adherents.length})</h2>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="subblock-title">Ajouter un adhérent</div>
        <form onSubmit={handleAdd}>
          <div className="field-row">
            <div className="field">
              <label>Nom *</label>
              <input type="text" name="nom" required />
            </div>
            <div className="field">
              <label>Prénom *</label>
              <input type="text" name="prenom" required />
            </div>
          </div>
          <div className="field">
            <label>Groupe</label>
            <select name="groupe">
              {GROUPES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-sm">
            Ajouter
          </button>
        </form>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="subblock-title">Import en masse</div>
        <p className="muted" style={{ fontSize: ".82rem", marginTop: 0 }}>
          Collez une ligne par adhérent, au format <span className="mono">Nom;Prénom;Groupe</span> — copiez-collez
          les colonnes depuis votre fichier Excel/CSV.
        </p>
        <form onSubmit={handleImport}>
          <textarea name="csv" placeholder={"Petit;Emma;Juniors\nBernard;Lucas;Benjamins"} />
          <button type="submit" className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}>
            Importer
          </button>
        </form>
      </div>

      {!adherents.length ? (
        <div className="empty-state">Aucun adhérent enregistré.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Groupe</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {adherents.map((a) => (
                <tr key={a.id}>
                  <td>{a.nom}</td>
                  <td>{a.prenom}</td>
                  <td>
                    <span className="pill pill-group">{a.groupe || "—"}</span>
                  </td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a.id)}>
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
