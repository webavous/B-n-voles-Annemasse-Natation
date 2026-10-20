import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeSearch } from "../lib/format";

export default function AdherentPicker({
  adherents,
  value,
  onChange,
  name = "adherent_id",
  required = false,
  placeholder = "Rechercher un adhérent (nom, prénom)…",
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const selected = useMemo(() => (adherents || []).find((a) => a.id === value) || null, [adherents, value]);

  useEffect(() => {
    setQuery(selected ? `${selected.prenom} ${selected.nom}` : "");
  }, [selected]);

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const results = useMemo(() => {
    const list = adherents || [];
    const q = normalizeSearch(query);
    if (!q) return list.slice(0, 40);
    return list
      .filter((a) => normalizeSearch(`${a.prenom} ${a.nom}`).includes(q) || normalizeSearch(`${a.nom} ${a.prenom}`).includes(q))
      .slice(0, 40);
  }, [adherents, query]);

  function pick(a) {
    onChange(a.id);
    setQuery(`${a.prenom} ${a.nom}`);
    setOpen(false);
  }

  function clear() {
    onChange("");
    setQuery("");
    setOpen(true);
  }

  return (
    <div className="adherent-picker" ref={wrapRef}>
      <input type="hidden" name={name} value={value || ""} required={required} />
      <div className="adherent-picker-input-wrap">
        <input
          type="text"
          className="adherent-picker-input"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (value) onChange("");
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (results.length === 1) pick(results[0]);
            }
          }}
          autoComplete="off"
        />
        {value && (
          <button type="button" className="adherent-picker-clear" onClick={clear} aria-label="Effacer la sélection">
            &times;
          </button>
        )}
      </div>
      {open && (
        <div className="adherent-picker-list">
          {!results.length ? (
            <div className="adherent-picker-empty">Aucun adhérent trouvé.</div>
          ) : (
            results.map((a) => (
              <button type="button" key={a.id} className="adherent-picker-item" onClick={() => pick(a)}>
                <span>
                  {a.prenom} {a.nom}
                </span>
                <span className="pill pill-group">{a.groupe || "—"}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
