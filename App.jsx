// App.jsx — top-level state, routing, modal orchestration
// All storage calls go through storage.js — swap that file to migrate to Google Drive

import { useState, useEffect } from "react";
import { LANGS } from "./i18n.js";
import { uid, today } from "./utils.js";
import { SAMPLE_FOODS } from "./constants.js";
import {
  loadLang, loadProfile, loadFoods, loadLogs,
  saveLang, saveProfile, saveFoods, saveLogs,
} from "./storage.js";

import { LogPage, HistoryPage }     from "./components/pages/LogHistoryPages.jsx";
import { StatsPage, FoodDbPage }    from "./components/pages/StatsAndFoodPages.jsx";
import { AddMealModal }             from "./components/modals/AddMealModal.jsx";
import { AddWaterModal, AddWasteModal } from "./components/modals/WaterWasteModals.jsx";
import { AddFoodModal, ProfileModal }   from "./components/modals/FoodProfileModals.jsx";

// Seed sample foods with stable IDs on first launch
const SEEDED_FOODS = SAMPLE_FOODS.map(f => ({ ...f, id: uid() }));

export default function App() {
  const [lang,    setLang]    = useState(() => loadLang());
  const [profile, setProfile] = useState(() => loadProfile());
  const [foods,   setFoods]   = useState(() => loadFoods(SEEDED_FOODS));
  const [logs,    setLogs]    = useState(() => loadLogs());
  const [tab,     setTab]     = useState("log");
  const [modal,   setModal]   = useState(null);
  // modal values: null | "addMeal" | "addWater" | "addWaste"
  //             | "addFood" | { type:"editFood", food } | "profile"

  const t = LANGS[lang];

  // ── Persist on change ──
  useEffect(() => { saveLang(lang); },    [lang]);
  useEffect(() => { saveProfile(profile); }, [profile]);
  useEffect(() => { saveFoods(foods); },  [foods]);
  useEffect(() => { saveLogs(logs); },    [logs]);

  // ── Log mutations ──
  const addLog    = (entry) => setLogs(prev => [{ ...entry, id: uid(), createdAt: new Date().toISOString() }, ...prev]);
  const deleteLog = (id)    => setLogs(prev => prev.filter(l => l.id !== id));

  // ── Food mutations ──
  const addFood    = (food) => setFoods(prev => [{ ...food, id: uid() }, ...prev]);
  const updateFood = (food) => setFoods(prev => prev.map(f => f.id === food.id ? food : f));

  // ── Today's derived data ──
  const todayLogs    = logs.filter(l => l.date === today());
  const todayMeals   = todayLogs.filter(l => l.kind === "meal");
  const todayWaters  = todayLogs.filter(l => l.kind === "water");
  const todayKcal    = todayMeals.reduce((s, l) => s + (l.totalKcal || 0), 0);
  const todayProtein = todayMeals.reduce((s, l) => s + (l.totalProtein || 0), 0);
  const todayWater   =
    todayMeals.reduce((s, l) => s + (l.totalWater || 0), 0) +
    todayWaters.reduce((s, l) => s + (l.ml || 0), 0);

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
              <button className="action-btn" onClick={() => setModal("addMeal")}>
                <span className="action-icon">🍽</span>
                {t.log.addMeal}
              </button>
              <button className="action-btn" onClick={() => setModal("addWater")}
                style={{ borderColor: "var(--sky-light)" }}>
                <span className="action-icon">💧</span>
                {t.log.addWater}
              </button>
              <button className="action-btn" onClick={() => setModal("addWaste")}
                style={{ borderColor: "#c8e8c0" }}>
                <span className="action-icon">🌿</span>
                {t.log.addWaste}
              </button>
            </div>
            <LogPage
              t={t} todayLogs={todayLogs}
              todayKcal={todayKcal} todayWater={todayWater} todayProtein={todayProtein}
              onDelete={deleteLog}
            />
          </>
        )}
        {tab === "history" && (
          <HistoryPage t={t} logs={logs} onDelete={deleteLog} />
        )}
        {tab === "stats" && (
          <StatsPage t={t} logs={logs} foods={foods} />
        )}
        {tab === "food" && (
          <FoodDbPage
            t={t} foods={foods}
            onAdd={() => setModal("addFood")}
            onEdit={(f) => setModal({ type: "editFood", food: f })}
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
    </>
  );
}
