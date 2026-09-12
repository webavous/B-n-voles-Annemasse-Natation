import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function AdminUsers() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    const { data, error: fnError } = await supabase.functions.invoke("create-admin", {
      body: { email, password },
    });

    setSubmitting(false);

    if (fnError || data?.error) {
      setError(
        data?.error ||
          fnError?.message ||
          "Échec de la création du compte. Vérifiez que la fonction « create-admin » est bien déployée sur Supabase."
      );
      return;
    }

    setMessage(
      `Compte créé pour ${email}. Communiquez-lui son email et ce mot de passe provisoire pour qu'il/elle se connecte sur /admin/connexion.`
    );
    setEmail("");
    setPassword("");
  }

  return (
    <div>
      <div className="section-title">
        <h2>Administrateurs</h2>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="subblock-title">Créer un accès administrateur</div>
        <p className="muted" style={{ fontSize: ".85rem", marginTop: 0 }}>
          Le compte est actif immédiatement, aucun email n'est envoyé — communiquez vous-même l'email et le mot de
          passe provisoire à la personne concernée.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Mot de passe provisoire</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                placeholder="Au moins 6 caractères"
                style={{ flex: 1 }}
              />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPassword(generatePassword())}>
                Générer
              </button>
            </div>
          </div>
          {error && <p className="error-text">{error}</p>}
          {message && <p style={{ color: "var(--accent)", fontSize: ".85rem", fontWeight: 600 }}>{message}</p>}
          <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
            {submitting ? "Création…" : "Créer le compte"}
          </button>
        </form>
      </div>

      <p className="muted" style={{ fontSize: ".8rem" }}>
        Pour voir la liste des administrateurs existants ou retirer un accès, direction Supabase &gt;
        Authentication &gt; Users.
      </p>
    </div>
  );
}
