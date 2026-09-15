export function fmtDateLong(isoDate) {
  const d = new Date(isoDate + "T00:00:00");
  const s = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function fmtDay(isoDate) {
  return new Date(isoDate + "T00:00:00").getDate().toString().padStart(2, "0");
}

export function fmtMonth(isoDate) {
  return new Date(isoDate + "T00:00:00")
    .toLocaleDateString("fr-FR", { month: "short" })
    .replace(".", "")
    .toUpperCase();
}

export function isPast(isoDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(isoDate + "T00:00:00") < today;
}

// Liste des moments de la journée proposés pour un poste (utile pour les
// événements qui durent plusieurs jours, avec des besoins différents matin/
// après-midi/soir).
export const MOMENTS = ["Matin", "Après-midi", "Soirée", "Journée entière"];

const MOMENT_ORDER = { Matin: 0, "Après-midi": 1, Soirée: 2, "Journée entière": 3 };

export function momentRank(moment) {
  return moment in MOMENT_ORDER ? MOMENT_ORDER[moment] : 4;
}

// Date courte pour les libellés de postes, ex. "ven. 8 nov."
export function fmtDateShort(isoDate) {
  if (!isoDate) return "";
  const s = new Date(isoDate + "T00:00:00").toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Affiche une plage de dates pour un événement sur plusieurs jours, ou une
// date unique si l'événement dure un seul jour.
export function fmtDateRange(dateDebut, dateFin) {
  if (!dateDebut) return "";
  if (!dateFin || dateFin === dateDebut) return fmtDateLong(dateDebut);
  const d1 = new Date(dateDebut + "T00:00:00");
  const d2 = new Date(dateFin + "T00:00:00");
  const sameMonth = d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
  if (sameMonth) {
    const jour1 = d1.toLocaleDateString("fr-FR", { day: "numeric" });
    const finLabel = d2.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    return `Du ${jour1} au ${finLabel}`;
  }
  const debutLabel = d1.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const finLabel = d2.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return `Du ${debutLabel} au ${finLabel}`;
}

// Libellé compact du créneau d'un poste (jour + moment), ex. "Ven. 8 nov. · Matin".
// Retourne une chaîne vide si le poste n'a pas de créneau précis (événement
// d'un seul jour, sans distinction matin/après-midi).
export function posteCreneauLabel(poste) {
  if (!poste) return "";
  const parts = [];
  if (poste.date) parts.push(fmtDateShort(poste.date));
  if (poste.moment && poste.moment !== "Journée entière") parts.push(poste.moment);
  return parts.join(" · ");
}

// Clé identifiant un créneau (jour + moment) — deux postes qui partagent la
// même clé se déroulent en même temps, donc une personne ne peut en choisir
// qu'un seul parmi eux (sinon ça fausse le nombre de places nécessaires).
export function posteCreneauKey(poste) {
  if (!poste) return "";
  return `${poste.date || ""}|${poste.moment || ""}`;
}
