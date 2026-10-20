import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { fmtDateRange } from "../lib/format";

// Page publique accessible depuis le lien "Annuler cette inscription" de
// l'email de confirmation — permet à un bénévole/officiel de se désister
// lui-même, sans avoir à passer par le club.
export default function Annulation() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [inscription, setInscription] = useState(null);
  const [event, setEvent] = useState(null);
  const [error, setError] = useState("");
  const [cancelled, setCancelled] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: insc } = await supabase
        .from("inscriptions_benevoles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!insc) {
        setError("Cette inscription est introuvable — elle a peut-être déjà été annulée.");
        setLoading(false);
        return;
      }
      setInscription(insc);
      const { data: form } = await supabase
        .from("formulaires_benevolat")
        .select("*")
        .eq("id", insc.formulaire_id)
        .maybeSingle();
      if (form) {
        const { data: ev } = await supabase
          .from("evenements")
          .select("*")
          .eq("id", form.evenement_id)
          .maybeSingle();
        setEvent(ev || null);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleCancel() {
    setWorking(true);
    const { error: delError } = await supabase.from("inscriptions_benevoles").delete().eq("id", id);
    setWorking(false);
    if (delError) {
      setError("L'annulation n'a pas pu être enregistrée, réessayez.");
      return;
    }
    setCancelled(true);
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
              {inscription.prenom} {inscription.nom}
              {event ? (
                <>
                  <br />
                  {event.titre} &middot; {fmtDateRange(event.date, event.date_fin)}
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
