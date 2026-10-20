import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fmtDateRange } from "../lib/format";

// Page publique accessible depuis le lien "Annuler cette inscription" de
// l'email de confirmation — permet à un bénévole/officiel de se désister
// lui-même, sans avoir à passer par le club. Passe par une fonction serveur
// dédiée (api/annulation.mjs) plutôt que d'interroger Supabase directement,
// pour ne pas avoir à ouvrir aux visiteurs un accès large à la table des
// inscriptions.
export default function Annulation() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [cancelled, setCancelled] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/annulation?id=${encodeURIComponent(id)}`);
        if (!res.ok) {
          setError("Cette inscription est introuvable — elle a peut-être déjà été annulée.");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setInfo(data);
      } catch {
        setError("Impossible de charger cette inscription, réessayez.");
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleCancel() {
    setWorking(true);
    try {
      const res = await fetch("/api/annulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        setError("L'annulation n'a pas pu être enregistrée, réessayez.");
        setWorking(false);
        return;
      }
      setCancelled(true);
    } catch {
      setError("L'annulation n'a pas pu être enregistrée, réessayez.");
    }
    setWorking(false);
  }

  return (
    <div className="wrap-narrow">
      <div className="card">
        {loading ? (
          <p className="muted">Chargement…</p>
        ) : cancelled ? (
          <>
            <h3>Inscription annulée</h3>
            <p className="modal-sub">Votre inscription a bien été retirée. Merci de nous avoir prévenus !</p>
          </>
        ) : error ? (
          <>
            <h3>Oups</h3>
            <p className="modal-sub">{error}</p>
          </>
        ) : (
          <>
            <h3>Annuler mon inscription</h3>
            <p className="modal-sub">
              {info.prenom} {info.nom}
              {info.eventTitre ? (
                <>
                  <br />
                  {info.eventTitre} &middot; {fmtDateRange(info.eventDate, info.eventDateFin)}
                </>
              ) : null}
            </p>
            <p>Confirmez-vous que vous ne pourrez finalement pas participer ?</p>
            <button
              className="btn btn-danger"
              onClick={handleCancel}
              disabled={working}
              style={{ width: "100%" }}
            >
              {working ? "Annulation…" : "Confirmer l'annulation"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
