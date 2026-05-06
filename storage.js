// storage.js — ALL reads/writes go through here.
// To migrate to Google Drive: implement the same interface below using Drive API.
// Components never touch localStorage directly.

const PREFIX = "cat_";
const key = (k) => PREFIX + k;

const parse = (raw, fallback) => {
  try { return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
};

// ── Read ──────────────────────────────────────────────────────────────────────
export const loadLang    = ()         => parse(localStorage.getItem(key("lang")),    "zh");
export const loadProfile = ()         => parse(localStorage.getItem(key("profile")), { name: "咪咪", breed: "", weight: "", photo: null });
export const loadFoods   = (defaults) => parse(localStorage.getItem(key("foods")),   defaults);
export const loadLogs    = ()         => parse(localStorage.getItem(key("logs")),    []);
// logs = [ ...mealLogs, ...waterLogs, ...wasteLogs ] — all mixed, sorted by createdAt desc
// each entry has a `kind` field: "meal" | "water" | "waste"

// ── Write ─────────────────────────────────────────────────────────────────────
export const saveLang    = (v) => localStorage.setItem(key("lang"),    JSON.stringify(v));
export const saveProfile = (v) => localStorage.setItem(key("profile"), JSON.stringify(v));
export const saveFoods   = (v) => localStorage.setItem(key("foods"),   JSON.stringify(v));
export const saveLogs    = (v) => localStorage.setItem(key("logs"),    JSON.stringify(v));

// ── Export (for future migration helper) ──────────────────────────────────────
export const exportAllData = () => ({
  lang:    loadLang(),
  profile: loadProfile(),
  foods:   loadFoods([]),
  logs:    loadLogs(),
  exportedAt: new Date().toISOString(),
});
