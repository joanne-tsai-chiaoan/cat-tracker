// Google Drive appDataFolder helpers

import { getToken } from "./auth.js";

const API    = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const FILE   = "cat-tracker.json";

const auth = () => ({ Authorization: `Bearer ${getToken()}` });

async function findId(name) {
  const q = encodeURIComponent(`name='${name}'`);
  const url = `${API}/files?spaces=appDataFolder&q=${q}&fields=files(id)`;
  console.log("[drive] findId →", name);
  const res = await fetch(url, { headers: auth() });
  if (!res.ok) {
    const text = await res.text();
    console.error("[drive] findId failed", res.status, text);
    return null;
  }
  const { files } = await res.json();
  console.log("[drive] findId result:", files?.length ?? 0, "files");
  return files?.[0]?.id ?? null;
}

// ── data.json ─────────────────────────────────────────────────────────────────

export async function readDriveData() {
  console.log("[drive] readDriveData start");
  const id = await findId(FILE);
  if (!id) { console.log("[drive] no data file yet"); return null; }
  const res = await fetch(`${API}/files/${id}?alt=media`, { headers: auth() });
  if (!res.ok) {
    console.error("[drive] readDriveData fetch failed", res.status, await res.text());
    return null;
  }
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
    res = await fetch(`${UPLOAD}/files/${id}?uploadType=media`, {
      method:  "PATCH",
      headers: { ...auth(), "Content-Type": "application/json" },
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
    res = await fetch(`${UPLOAD}/files?uploadType=multipart`, {
      method:  "POST",
      headers: auth(),
      body:    form,
    });
  }

  if (!res.ok) {
    console.error("[drive] writeDriveData failed", res.status, await res.text());
    throw new Error(`writeDriveData ${res.status}`);
  }
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

  const res = await fetch(`${UPLOAD}/files?uploadType=multipart&fields=id`, {
    method:  "POST",
    headers: auth(),
    body:    form,
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("[drive] uploadPhoto failed", res.status, text);
    throw new Error(`uploadPhoto ${res.status}`);
  }
  const { id } = await res.json();
  console.log("[drive] uploadPhoto OK →", id);
  return id;
}

export async function fetchPhotoBlob(driveFileId) {
  console.log("[drive] fetchPhotoBlob →", driveFileId);
  const res = await fetch(`${API}/files/${driveFileId}?alt=media`, { headers: auth() });
  if (!res.ok) {
    console.error("[drive] fetchPhotoBlob failed", res.status);
    throw new Error(`fetchPhotoBlob ${res.status}`);
  }
  return URL.createObjectURL(await res.blob());
}
