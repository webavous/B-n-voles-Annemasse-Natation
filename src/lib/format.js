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
