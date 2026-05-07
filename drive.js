// Google Drive appDataFolder helpers

import { getToken } from "./auth.js";

const API    = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const FILE   = "cat-tracker.json";

const auth = () => ({ Authorization: `Bearer ${getToken()}` });

// Fetch with auth header injected. Logs error body on failure; never throws.
async function driveRequest(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { ...auth(), ...init.headers },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[drive]", init.method ?? "GET", url.split("?")[0], res.status, text);
  }
  return res;
}

async function findId(name) {
  const q = encodeURIComponent(`name='${name}'`);
  console.log("[drive] findId →", name);
  const res = await driveRequest(`${API}/files?spaces=appDataFolder&q=${q}&fields=files(id)`);
  if (!res.ok) return null;
  const { files } = await res.json();
  console.log("[drive] findId result:", files?.length ?? 0, "files");
  return files?.[0]?.id ?? null;
}

// ── data.json ─────────────────────────────────────────────────────────────────

export async function readDriveData() {
  console.log("[drive] readDriveData start");
  const id = await findId(FILE);
  if (!id) { console.log("[drive] no data file yet"); return null; }
  const res = await driveRequest(`${API}/files/${id}?alt=media`);
  if (!res.ok) return null;
  const data = await res.json();
  console.log("[drive] readDriveData OK — logs:", data.logs?.length ?? 0);
  return data;
}

export async function writeDriveData(data) {
  console.log("[drive] writeDriveData start — logs:", data.logs?.length ?? 0);
  const body = JSON.stringify(data);
  const id   = await findId(FILE);

  let res;
  if (id) {
    console.log("[drive] PATCH existing file", id);
    res = await driveRequest(`${UPLOAD}/files/${id}?uploadType=media`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body,
    });
  } else {
    console.log("[drive] POST new file");
    const form = new FormData();
    form.append("metadata", new Blob(
      [JSON.stringify({ name: FILE, parents: ["appDataFolder"] })],
      { type: "application/json" }
    ));
    form.append("file", new Blob([body], { type: "application/json" }));
    res = await driveRequest(`${UPLOAD}/files?uploadType=multipart`, {
      method: "POST",
      body:   form,
    });
  }

  if (!res.ok) throw new Error(`writeDriveData ${res.status}`);
  console.log("[drive] writeDriveData OK");
}

// ── Photos ────────────────────────────────────────────────────────────────────

export async function uploadPhoto(dataUrl) {
  console.log("[drive] uploadPhoto start, size:", Math.round(dataUrl.length / 1024), "KB");
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

  const res = await driveRequest(`${UPLOAD}/files?uploadType=multipart&fields=id`, {
    method: "POST",
    body:   form,
  });
  if (!res.ok) throw new Error(`uploadPhoto ${res.status}`);
  const { id } = await res.json();
  console.log("[drive] uploadPhoto OK →", id);
  return id;
}

export async function fetchPhotoBlob(driveFileId) {
  console.log("[drive] fetchPhotoBlob →", driveFileId);
  const res = await driveRequest(`${API}/files/${driveFileId}?alt=media`);
  if (!res.ok) throw new Error(`fetchPhotoBlob ${res.status}`);
  return URL.createObjectURL(await res.blob());
}
