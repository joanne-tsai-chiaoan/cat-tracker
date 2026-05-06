// Google Drive appDataFolder helpers
// JSON data + individual photo files, all in the hidden app folder.

import { getToken } from "./auth.js";

const API    = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const FILE   = "cat-tracker.json";

const auth = () => ({ Authorization: `Bearer ${getToken()}` });

async function findId(name) {
  const q = encodeURIComponent(`name='${name}'`);
  const res = await fetch(
    `${API}/files?spaces=appDataFolder&q=${q}&fields=files(id)`,
    { headers: auth() }
  );
  if (!res.ok) return null;
  const { files } = await res.json();
  return files?.[0]?.id ?? null;
}

// ── data.json ─────────────────────────────────────────────────────────────────

export async function readDriveData() {
  const id = await findId(FILE);
  if (!id) return null;
  const res = await fetch(`${API}/files/${id}?alt=media`, { headers: auth() });
  return res.ok ? res.json() : null;
}

export async function writeDriveData(data) {
  const body = JSON.stringify(data);
  const id   = await findId(FILE);

  if (id) {
    await fetch(`${UPLOAD}/files/${id}?uploadType=media`, {
      method:  "PATCH",
      headers: { ...auth(), "Content-Type": "application/json" },
      body,
    });
  } else {
    const form = new FormData();
    form.append("metadata", new Blob(
      [JSON.stringify({ name: FILE, parents: ["appDataFolder"] })],
      { type: "application/json" }
    ));
    form.append("file", new Blob([body], { type: "application/json" }));
    await fetch(`${UPLOAD}/files?uploadType=multipart`, {
      method:  "POST",
      headers: auth(),
      body:    form,
    });
  }
}

// ── Photos ────────────────────────────────────────────────────────────────────

// Upload a data URL → returns Drive file ID
export async function uploadPhoto(dataUrl) {
  const blob     = await (await fetch(dataUrl)).blob();
  const mimeType = blob.type || "image/jpeg";
  const ext      = mimeType.includes("png") ? "png" : "jpg";
  const name     = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;

  const form = new FormData();
  form.append("metadata", new Blob(
    [JSON.stringify({ name, parents: ["appDataFolder"] })],
    { type: "application/json" }
  ));
  form.append("file", blob);

  const res = await fetch(`${UPLOAD}/files?uploadType=multipart&fields=id`, {
    method:  "POST",
    headers: auth(),
    body:    form,
  });
  if (!res.ok) throw new Error(`Photo upload failed: ${res.status}`);
  const { id } = await res.json();
  return id;
}

// Fetch a Drive file → returns a blob URL (caller must revoke when done)
export async function fetchPhotoBlob(driveFileId) {
  const res = await fetch(`${API}/files/${driveFileId}?alt=media`, { headers: auth() });
  if (!res.ok) throw new Error(`Photo fetch failed: ${res.status}`);
  return URL.createObjectURL(await res.blob());
}
