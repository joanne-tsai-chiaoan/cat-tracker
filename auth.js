// Google Identity Services OAuth2 implicit grant
// Stores access token in localStorage; no server needed.

const CLIENT_ID = "892704147487-58lel4qvkinjtu4b3h7i54k7vj21geq4.apps.googleusercontent.com";
const SCOPE     = "https://www.googleapis.com/auth/drive.appdata";
const LS_TOKEN  = "cat_goog_token";
const LS_EXPIRY = "cat_goog_expiry";

let _client     = null;
let _successCb  = null;
const _listeners = new Set();

function notify(token) {
  _listeners.forEach(fn => fn(token));
}

function buildClient() {
  return window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback: (resp) => {
      if (resp.error) { console.error("GIS error:", resp.error); return; }
      const expiry = Date.now() + resp.expires_in * 1000 - 60_000; // 1-min buffer
      localStorage.setItem(LS_TOKEN,  resp.access_token);
      localStorage.setItem(LS_EXPIRY, String(expiry));
      const cb = _successCb; _successCb = null;
      cb?.();
      notify(resp.access_token);
    },
  });
}

const getClient = () => { if (!_client) _client = buildClient(); return _client; };

export const isSignedIn = () => {
  const token  = localStorage.getItem(LS_TOKEN);
  const expiry = Number(localStorage.getItem(LS_EXPIRY));
  return !!(token && Date.now() < expiry);
};

export const getToken = () => localStorage.getItem(LS_TOKEN);

export function signIn(onSuccess) {
  _successCb = onSuccess ?? null;
  // prompt:"" tries silent refresh first; shows account picker only if needed
  getClient().requestAccessToken({ prompt: "" });
}

export function signOut() {
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
