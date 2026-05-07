// Google Identity Services OAuth2 implicit grant

const CLIENT_ID  = "892704147487-58lel4qvkinjtu4b3h7i54k7vj21geq4.apps.googleusercontent.com";
const SCOPE      = "https://www.googleapis.com/auth/drive.appdata";
const LS_TOKEN   = "cat_goog_token";
const LS_EXPIRY  = "cat_goog_expiry";

let _client      = null;
let _successCb   = null;
const _listeners = new Set();

function notify(token) {
  _listeners.forEach(fn => fn(token));
}

function buildClient() {
  console.log("[auth] buildClient — GIS ready");
  return window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback: (resp) => {
      console.log("[auth] token callback", resp.error ?? "OK", "expires_in:", resp.expires_in);
      if (resp.error) { console.error("[auth] GIS error:", resp.error, resp.error_description); return; }
      const expiry = Date.now() + resp.expires_in * 1000 - 60_000;
      localStorage.setItem(LS_TOKEN,  resp.access_token);
      localStorage.setItem(LS_EXPIRY, String(expiry));
      const cb = _successCb; _successCb = null;
      cb?.();
      notify(resp.access_token);
    },
  });
}

// Wait for GIS library to load (it's loaded async)
function waitForGIS() {
  return new Promise((resolve) => {
    if (window.google?.accounts?.oauth2) { resolve(); return; }
    const interval = setInterval(() => {
      if (window.google?.accounts?.oauth2) { clearInterval(interval); resolve(); }
    }, 100);
  });
}

const getClient = () => { if (!_client) _client = buildClient(); return _client; };

export const isSignedIn = () => {
  const token  = localStorage.getItem(LS_TOKEN);
  const expiry = Number(localStorage.getItem(LS_EXPIRY));
  return !!(token && Date.now() < expiry);
};

export const getToken = () => localStorage.getItem(LS_TOKEN);

export async function signIn(onSuccess) {
  console.log("[auth] signIn called");
  _successCb = onSuccess ?? null;
  await waitForGIS();
  console.log("[auth] GIS ready, requesting token");
  getClient().requestAccessToken({ prompt: "" });
}

// Call on page load: silently restores session if token expired.
// GIS will re-issue a token without any UI if consent was previously granted.
export async function tryAutoRefresh() {
  if (!localStorage.getItem(LS_TOKEN)) return; // never signed in
  if (isSignedIn()) return;                     // token still valid
  console.log("[auth] token expired — attempting silent refresh");
  await waitForGIS();
  getClient().requestAccessToken({ prompt: "" });
}

export function signOut() {
  console.log("[auth] signOut");
  const token = getToken();
  if (token) {
    try { window.google?.accounts.oauth2.revoke(token, () => {}); } catch {}
  }
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_EXPIRY);
  notify(null);
}

export function onTokenChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
