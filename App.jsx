// App.jsx — top-level state, routing, modal orchestration

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { LANGS } from "./i18n.js";
import { uid, today } from "./utils.js";
import { SAMPLE_FOODS } from "./constants.js";
import {
  loadLang, loadProfile, loadFoods, loadLogs, loadTrash,
  saveLang, saveProfile, saveFoods, saveLogs, saveTrash,
  syncFromDrive, syncToDrive, mergeLogs, mergeFoods,
} from "./storage.js";
import { isSignedIn, signIn, signOut, onTokenChange, tryAutoRefresh } from "./auth.js";
import { uploadPhoto } from "./drive.js";

import { LogPage, HistoryPage }     from "./components/pages/LogHistoryPages.jsx";
import { StatsPage, FoodDbPage }    from "./components/pages/StatsAndFoodPages.jsx";
import { AddMealModal }             from "./components/modals/AddMealModal.jsx";
import { AddWaterModal, AddWasteModal } from "./components/modals/WaterWasteModals.jsx";
import { AddFoodModal, ProfileModal }   from "./components/modals/FoodProfileModals.jsx";

// Seed sample foods with stable IDs on first launch
const SEEDED_FOODS = SAMPLE_FOODS.map(f => ({ ...f, id: uid() }));

export default function App() {
  const [lang,       setLang]       = useState(() => loadLang());
  const [profile,    setProfile]    = useState(() => loadProfile());
  const [foods,      setFoods]      = useState(() => loadFoods(SEEDED_FOODS));
  const [logs,       setLogs]       = useState(() => loadLogs());
  const [trash,      setTrash]      = useState(() => loadTrash());
  const [tab,        setTab]        = useState("log");
  const [modal,      setModal]      = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [syncStatus, setSyncStatus] = useState(() => isSignedIn() ? "syncing" : "idle");
  // syncStatus: "idle" | "syncing" | "ok" | "error"

  const t        = LANGS[lang];
  const stateRef = useRef(null);
  const syncTimer = useRef(null);

  // Keep a ref to latest state for the debounced Drive push
  useEffect(() => { stateRef.current = { lang, profile, foods, logs }; });

  // ── Persist to localStorage on change ──
  useEffect(() => { saveLang(lang); },       [lang]);
  useEffect(() => { saveProfile(profile); }, [profile]);
  useEffect(() => { saveFoods(foods); },     [foods]);
  useEffect(() => { saveLogs(logs); },       [logs]);
  useEffect(() => { saveTrash(trash); },     [trash]);

  // ── Prune trash entries older than 7 days on mount ──
  useEffect(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    setTrash(prev => prev.filter(l => new Date(l.trashedAt).getTime() > cutoff));
  }, []);

  // ── On mount: attempt silent token refresh (keeps user logged in across reloads) ──
  useEffect(() => { tryAutoRefresh(); }, []);

  // ── Flush Drive sync immediately when user switches away / closes tab ──
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === "hidden" && isSignedIn() && stateRef.current) {
        clearTimeout(syncTimer.current);
        syncToDrive(stateRef.current); // fire-and-forget; browser allows short async on hide
      }
    };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, []);

  // ── Shared Drive pull + merge logic ──
  // Both the initial pull and the token-change handler are identical in behaviour;
  // extracting them here removes the duplication.
  const applyDriveData = useCallback(async () => {
    const data = await syncFromDrive();
    if (data) {
      if (data.lang)    setLang(data.lang);
      if (data.profile) setProfile(data.profile);
      if (data.foods)   setFoods(prev => mergeFoods(prev, data.foods));
      if (data.logs)    setLogs(prev => mergeLogs(prev, data.logs));
    } else {
      // No Drive file yet — push local data now
      console.log("[app] no Drive file, pushing local data");
      if (stateRef.current) syncToDrive(stateRef.current);
    }
    setSyncStatus("ok");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initial Drive pull (if already signed in from a previous session) ──
  useEffect(() => {
    if (!isSignedIn()) return;
    console.log("[app] already signed in — pulling from Drive");
    setSyncStatus("syncing");
    applyDriveData().catch(e => { console.error("[app] initial pull failed", e); setSyncStatus("error"); });
  }, [applyDriveData]);

  // ── Listen for sign-in / sign-out ──
  useEffect(() => {
    return onTokenChange(async (token) => {
      if (!token) { setSyncStatus("idle"); return; }
      setSyncStatus("syncing");
      console.log("[app] token received — pulling from Drive");
      applyDriveData().catch(e => { console.error("[app] sync failed", e); setSyncStatus("error"); });
    });
  }, [applyDriveData]);

  // ── Debounced Drive push after any state change ──
  useEffect(() => {
    if (!isSignedIn()) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      if (stateRef.current) syncToDrive(stateRef.current);
    }, 3000);
  }, [lang, profile, foods, logs]);

  // ── Log mutations ──
  const patchLog = (updatedLog) => {
    setLogs(prev => prev.map(l => l.id === updatedLog.id ? updatedLog : l));
  };

  const addLog = (entry) => {
    const logEntry = { ...entry, id: uid(), createdAt: new Date().toISOString() };
    setLogs(prev => [logEntry, ...prev]);

    // Upload photos to Drive in background; replace data URLs with Drive file IDs
    if (isSignedIn() && entry.photos?.length) {
      Promise.all(
        entry.photos.map(dataUrl => uploadPhoto(dataUrl).catch(() => dataUrl))
      ).then(photoIds => {
        setLogs(prev => prev.map(l =>
          l.id === logEntry.id
            ? { ...l, photos: undefined, photoIds: photoIds.map(id => id.startsWith("data:") ? id : `drive:${id}`) }
            : l
        ));
      });
    }
  };

  const trashLog = (log) => {
    setLogs(prev => prev.filter(l => l.id !== log.id));
    setTrash(prev => [{ ...log, trashedAt: new Date().toISOString() }, ...prev]);
  };

  const recoverLog = (log) => {
    const { trashedAt, ...clean } = log;
    setTrash(prev => prev.filter(l => l.id !== log.id));
    setLogs(prev => [clean, ...prev].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  };

  const permanentDeleteLog = (id) => setTrash(prev => prev.filter(l => l.id !== id));

  const updateLog = (entry) => {
    setLogs(prev => prev.map(l =>
      l.id === editTarget.id
        ? { ...entry, id: editTarget.id, createdAt: editTarget.createdAt }
        : l
    ));
    setEditTarget(null);
  };

  const handleEditLog = (log) => {
    setEditTarget(log);
    setModal("edit" + log.kind.charAt(0).toUpperCase() + log.kind.slice(1)); // "editMeal", "editWater", "editWaste"
  };

  // ── Food mutations ──
  const addFood = (food) => setFoods(prev => [{ ...food, id: uid() }, ...prev]);
  const updateFood = (food) => {
    setFoods(prev => prev.map(f => f.id === food.id ? food : f));
    const patchMealLog = (log) => {
      if (log.kind !== "meal" || !log.items) return log;
      let changed = false;
      const next = log.items.map(item => {
        if (item.foodId !== food.id) return item;
        changed = true;
        return {
          ...item,
          foodName:     food.name,
          foodType:     food.type,
          foodSubtype:  food.subtype,
          kcal:         +((food.kcalPer100g    * item.grams) / 100).toFixed(2),
          protein:      +((food.proteinPer100g * item.grams) / 100).toFixed(2),
          waterFromFood:+(((food.waterPer100g ?? 0) * item.grams) / 100).toFixed(2),
        };
      });
      if (!changed) return log;
      const totalKcal          = next.reduce((s, i) => s + i.kcal,          0);
      const totalProtein       = next.reduce((s, i) => s + i.protein,       0);
      const totalWaterFromFood = next.reduce((s, i) => s + i.waterFromFood, 0);
      const totalWater         = totalWaterFromFood + (log.extraWaterMl || 0);
      return { ...log, items: next, totalKcal, totalProtein, totalWater, totalWaterFromFood };
    };
    setLogs(prev => prev.map(patchMealLog));
    setTrash(prev => prev.map(patchMealLog));
  };

  // ── Today's derived data (memoised — only recomputes when logs change) ──
  const { todayLogs, todayKcal, todayProtein, todayWater } = useMemo(() => {
    const todayLogs  = logs.filter(l => l.date === today());
    const meals      = todayLogs.filter(l => l.kind === "meal");
    const waters     = todayLogs.filter(l => l.kind === "water");
    const todayKcal    = meals.reduce((s, l) => s + (l.totalKcal    || 0), 0);
    const todayProtein = meals.reduce((s, l) => s + (l.totalProtein || 0), 0);
    const todayWater   =
      meals.reduce( (s, l) => s + (l.totalWater || 0), 0) +
      waters.reduce((s, l) => s + (l.ml         || 0), 0);
    return { todayLogs, todayKcal, todayProtein, todayWater };
  }, [logs]);

  const closeModal = () => setModal(null);

  return (
    <>
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-top">
          <div className="cat-avatar" onClick={() => setModal("profile")}>
            {profile.photo ? <img src={profile.photo} alt="cat" /> : <span>🐱</span>}
          </div>
          <div className="header-info">
            <div className="cat-name">{profile.name || "咪咪"}</div>
            <div className="cat-subtitle">{t.appSub}</div>
          </div>
          <button className="lang-toggle" onClick={() => setLang(l => l === "zh" ? "en" : "zh")}>
            {lang === "zh" ? "EN" : "中"}
          </button>
          <button
            className={`trash-btn${trash.length > 0 ? " trash-btn--has-items" : ""}`}
            onClick={() => setModal("trash")}
            aria-label="Trash"
          >
            🗑{trash.length > 0 && <span className="trash-badge">{trash.length}</span>}
          </button>
          <button
            className={`drive-btn drive-btn--${syncStatus}`}
            title={syncStatus === "idle" ? "連結 Google Drive" : syncStatus === "syncing" ? "同步中…" : syncStatus === "ok" ? "已同步 — 點擊登出" : "同步失敗"}
            onClick={() => {
              if (isSignedIn()) { signOut(); setSyncStatus("idle"); }
              else { setSyncStatus("syncing"); signIn(); }
            }}
          >
            {syncStatus === "syncing" ? "↻" : syncStatus === "ok" ? "☁✓" : syncStatus === "error" ? "☁!" : "☁"}
          </button>
        </div>

        {/* Today summary — only on log tab */}
        {tab === "log" && (
          <div className="today-summary">
            <div className="today-chip">
              <span className="today-label">{t.log.todayKcal}</span>
              <span className="today-val">{todayKcal.toFixed(0)} <em>kcal</em></span>
            </div>
            <div className="today-chip">
              <span className="today-label">{t.log.todayProtein}</span>
              <span className="today-val">{todayProtein.toFixed(1)} <em>g</em></span>
            </div>
            <div className="today-chip">
              <span className="today-label">{t.log.todayWater}</span>
              <span className="today-val water">{todayWater.toFixed(0)} <em>ml</em></span>
            </div>
          </div>
        )}
      </header>

      {/* ── Pages ── */}
      <main className="page" key={tab}>
        {tab === "log" && (
          <>
            {/* Quick-action buttons */}
            <div className="action-row">
              <button className="action-btn action-btn--meal" onClick={() => setModal("addMeal")}>
                <span className="action-icon">🍽</span>
                {t.log.addMeal}
              </button>
              <button className="action-btn action-btn--water" onClick={() => setModal("addWater")}>
                <span className="action-icon">💧</span>
                {t.log.addWater}
              </button>
              <button className="action-btn action-btn--waste" onClick={() => setModal("addWaste")}>
                <span className="action-icon">🌿</span>
                {t.log.addWaste}
              </button>
            </div>
            <LogPage
              t={t} foods={foods} todayLogs={todayLogs}
              todayKcal={todayKcal} todayWater={todayWater} todayProtein={todayProtein}
              onTrash={trashLog} onPatch={patchLog}
            />
          </>
        )}
        {tab === "history" && (
          <HistoryPage t={t} foods={foods} logs={logs} onTrash={trashLog} onPatch={patchLog} />
        )}
        {tab === "stats" && (
          <StatsPage t={t} logs={logs} foods={foods} />
        )}
        {tab === "food" && (
          <FoodDbPage
            t={t} foods={foods}
            onAdd={() => setModal("addFood")}
            onEdit={(f) => setModal({ type: "editFood", food: f })}
            onDelete={id => setFoods(prev => prev.filter(f => f.id !== id))}
          />
        )}
      </main>

      {/* ── Bottom nav ── */}
      <nav className="bottom-nav">
        {[
          { k: "log",     icon: "🐾", label: t.nav.log },
          { k: "history", icon: "📋", label: t.nav.history },
          { k: "stats",   icon: "📊", label: t.nav.stats },
          { k: "food",    icon: "🗃",  label: t.nav.food },
        ].map(({ k, icon, label }) => (
          <button key={k} className={`nav-btn${tab === k ? " active" : ""}`} onClick={() => setTab(k)}>
            <span className="nav-icon">{icon}</span>
            {label}
          </button>
        ))}
      </nav>

      {/* ── Modals ── */}
      {modal === "addMeal" && (
        <AddMealModal t={t} foods={foods}
          onSave={(e) => { addLog(e); closeModal(); }}
          onClose={closeModal} />
      )}
      {modal === "addWater" && (
        <AddWaterModal t={t}
          onSave={(e) => { addLog(e); closeModal(); }}
          onClose={closeModal} />
      )}
      {modal === "addWaste" && (
        <AddWasteModal t={t}
          onSave={(e) => { addLog(e); closeModal(); }}
          onClose={closeModal} />
      )}
      {modal === "editMeal" && editTarget && (
        <AddMealModal t={t} foods={foods} initial={editTarget}
          onSave={entry => { updateLog(entry); closeModal(); }}
          onClose={closeModal} />
      )}
      {modal === "editWater" && editTarget && (
        <AddWaterModal t={t} initial={editTarget}
          onSave={entry => { updateLog(entry); closeModal(); }}
          onClose={closeModal} />
      )}
      {modal === "editWaste" && editTarget && (
        <AddWasteModal t={t} initial={editTarget}
          onSave={entry => { updateLog(entry); closeModal(); }}
          onClose={closeModal} />
      )}
      {modal === "addFood" && (
        <AddFoodModal t={t}
          onSave={(f) => { addFood(f); closeModal(); }}
          onClose={closeModal} />
      )}
      {modal?.type === "editFood" && (
        <AddFoodModal t={t} initial={modal.food}
          onSave={(f) => { updateFood(f); closeModal(); }}
          onClose={closeModal} />
      )}
      {modal === "profile" && (
        <ProfileModal t={t} profile={profile}
          onSave={(p) => { setProfile(p); closeModal(); }}
          onClose={closeModal} />
      )}
      {modal === "trash" && (
        <TrashModal
          t={t} trash={trash}
          onRecover={recoverLog}
          onDelete={permanentDeleteLog}
          onClose={closeModal}
        />
      )}
    </>
  );
}

// ── TrashModal ────────────────────────────────────────────────────────────────
function TrashModal({ t, trash, onRecover, onDelete, onClose }) {
  const now = Date.now();
  const daysLeft = (item) => {
    const elapsed = now - new Date(item.trashedAt).getTime();
    return Math.max(0, 7 - Math.floor(elapsed / (24 * 60 * 60 * 1000)));
  };

  const kindLabel = (log) => {
    if (log.kind === "meal")  return log.items?.[0]?.foodName ?? (t.log.mealTypes[log.mealType] || log.mealType);
    if (log.kind === "water") return `💧 ${log.ml} ml`;
    if (log.kind === "waste") return `${log.wasteType === "poop" ? "💩" : "💧"} ${t.waste.types[log.wasteType]}`;
    return log.kind;
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-title">🗑 {t.trash?.title ?? "Trash"}</div>

        {trash.length === 0 ? (
          <div className="trash-empty">{t.trash?.empty ?? "No deleted records"}</div>
        ) : (
          <div className="trash-list">
            {trash.map(log => (
              <div key={log.id} className="trash-item">
                <div className="trash-item-info">
                  <div className="trash-item-label">{kindLabel(log)}</div>
                  <div className="trash-item-meta">
                    {log.date} · {t.trash?.daysLeft?.(daysLeft(log)) ?? `${daysLeft(log)}d left`}
                  </div>
                </div>
                <div className="trash-item-actions">
                  <button className="btn btn-sm btn-ghost" onClick={() => onRecover(log)}>
                    {t.trash?.recover ?? "Recover"}
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => onDelete(log.id)}>
                    {t.trash?.deletePerm ?? "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button className="btn btn-ghost btn-full" style={{ marginTop: 16 }} onClick={onClose}>
          {t.common.close}
        </button>
      </div>
    </div>
  );
}
