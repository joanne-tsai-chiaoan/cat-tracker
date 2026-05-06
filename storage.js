// storage.js — ALL reads/writes go through here.
// Sync reads/writes use localStorage (fast, works offline).
// Async functions sync with Google Drive when signed in.

import { isSignedIn } from "./auth.js";
import { readDriveData, writeDriveData, fetchPhotoBlob } from "./drive.js";

const PREFIX = "cat_";
const key    = (k) => PREFIX + k;

const parse = (raw, fallback) => {
  try { return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
};

// ── Sync reads (localStorage) ─────────────────────────────────────────────────
export const loadLang    = ()         => parse(localStorage.getItem(key("lang")),    "zh");
export const loadProfile = ()         => parse(localStorage.getItem(key("profile")), { name: "咪咪", breed: "", weight: "", photo: null });
export const loadFoods   = (defaults) => parse(localStorage.getItem(key("foods")),   defaults);
export const loadLogs    = ()         => parse(localStorage.getItem(key("logs")),    []);

// ── Sync writes (localStorage) ────────────────────────────────────────────────
export const saveLang    = (v) => localStorage.setItem(key("lang"),    JSON.stringify(v));
export const saveProfile = (v) => localStorage.setItem(key("profile"), JSON.stringify(v));
export const saveFoods   = (v) => localStorage.setItem(key("foods"),   JSON.stringify(v));
export const saveLogs    = (v) => localStorage.setItem(key("logs"),    JSON.stringify(v));

// ── Drive sync ────────────────────────────────────────────────────────────────

// Pull Drive → localStorage → return data (null on failure / not signed in)
export async function syncFromDrive() {
  if (!isSignedIn()) return null;
  try {
    const data = await readDriveData();
    if (!data) return null;
    if (data.lang)    localStorage.setItem(key("lang"),    JSON.stringify(data.lang));
    if (data.profile) localStorage.setItem(key("profile"), JSON.stringify(data.profile));
    if (data.foods)   localStorage.setItem(key("foods"),   JSON.stringify(data.foods));
    if (data.logs)    localStorage.setItem(key("logs"),    JSON.stringify(data.logs));
    return data;
  } catch (e) {
    console.error("Drive pull failed:", e);
    return null;
  }
}

// Push current state to Drive (only text data — photos are separate files)
export async function syncToDrive({ lang, profile, foods, logs }) {
  if (!isSignedIn()) return;
  try {
    await writeDriveData({ lang, profile, foods, logs, syncedAt: new Date().toISOString() });
  } catch (e) {
    console.error("Drive push failed:", e);
  }
}

// ── Photo cache ───────────────────────────────────────────────────────────────
// In-memory blob URL cache. Valid for this browser session only.
const _photoCache = {};

// Returns a displayable URL for a photo reference:
//   - "data:..."      → return as-is (local data URL, no Drive needed)
//   - "drive:FILE_ID" → fetch from Drive, cache blob URL
export async function getPhotoUrl(ref) {
  if (!ref) return null;
  if (ref.startsWith("data:")) return ref;
  const fileId = ref.startsWith("drive:") ? ref.slice(6) : ref;
  if (_photoCache[fileId]) return _photoCache[fileId];
  try {
    const url = await fetchPhotoBlob(fileId);
    _photoCache[fileId] = url;
    return url;
  } catch {
    return null; // offline or deleted
  }
}
