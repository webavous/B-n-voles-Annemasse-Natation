import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Brand from "../components/Brand.jsx";

export default function AdminLogin() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/admin" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const { error: signInError } = await signIn(email, password);
    setSubmitting(false);
    if (signInError) {
      setError("Email ou mot de passe incorrect.");
      return;
    }
    navigate("/admin");
  }

  return (
    <div className="wrap-narrow">
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
        <Brand />
      </div>
      <div className="card">
        <h3>Connexion administrateur</h3>
        <p className="modal-sub">Accès réservé aux administrateurs du club.</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="field">
            <label>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={submitting}>
            {submitting ? "Connexion…" : "Se connecter"}
          </button>
        </form>
        <p className="muted" style={{ fontSize: ".76rem", marginTop: 14 }}>
          Les comptes administrateurs se créent depuis Supabase (Authentication &gt; Users), pas ici.
        </p>
        <p style={{ marginTop: 10 }}>
          <Link to="/" style={{ fontSize: ".82rem" }}>
            ← Retour à la page publique
          </Link>
        </p>
      </div>
    </div>
  );
}
