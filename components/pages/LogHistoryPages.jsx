// components/pages/LogPage.jsx

import { useState, useEffect } from "react";
import { fmtTime } from "../../utils.js";
import { Lightbox, DriveImg } from "../ui/index.jsx";
import { getPhotoUrl } from "../../storage.js";

// ── LogPage ───────────────────────────────────────────────────────────────────
export function LogPage({ t, todayLogs, todayKcal, todayWater, todayProtein, onDelete }) {
  return (
    <div>
      <div className="section-title">
        {t.log.title} <span className="section-sub">{t.log.sub}</span>
      </div>

      {!todayLogs.length ? (
        <div className="empty-state">
          <div className="empty-icon">🐾</div>
          <div className="empty-title">{t.log.noLog}</div>
          <div className="empty-sub">{t.log.noLogSub}</div>
        </div>
      ) : (
        todayLogs.map(log => (
          <LogCard key={log.id} log={log} t={t} onDelete={onDelete} />
        ))
      )}
    </div>
  );
}

// ── LogCard ───────────────────────────────────────────────────────────────────
export function LogCard({ log, t, onDelete }) {
  const [confirm, setConfirm] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  // Auto-cancel delete confirm after 2.5s
  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(false), 2500);
    return () => clearTimeout(t);
  }, [confirm]);

  return (
    <div className={`log-card kind-${log.kind}`}>
      {/* Corner delete — tap once to arm, tap again to confirm */}
      <button
        className={`card-del${confirm ? " card-del--confirm" : ""}`}
        onClick={() => confirm ? onDelete(log.id) : setConfirm(true)}
        aria-label={confirm ? t.common.confirm : t.common.delete}
      >
        {confirm ? "✓" : "×"}
      </button>

      {log.kind === "meal"  && <MealCardBody  log={log} t={t} onPhotoClick={setLightbox} />}
      {log.kind === "water" && <WaterCardBody log={log} t={t} />}
      {log.kind === "waste" && <WasteCardBody log={log} t={t} onPhotoClick={setLightbox} />}

      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}

function MealCardBody({ log, t, onPhotoClick }) {
  return (
    <>
      <div className="log-card-header">
        <div>
          <div className="log-kind-label">
            {t.log.mealTypes[log.mealType] || log.mealType}
          </div>
          <div className="log-time">{fmtTime(log.createdAt)}</div>
        </div>
        <div className="log-summary">
          <span className="log-summary-main">{log.totalKcal.toFixed(0)} kcal</span>
          <span className="log-summary-sub">{log.totalProtein.toFixed(1)}g protein</span>
          <span className="log-summary-sub">💧 {log.totalWater.toFixed(0)} ml</span>
        </div>
      </div>

      {log.items.map((item, i) => (
        <div key={i} className="log-food-row">
          <span className={`type-badge type-${item.foodType}`}>{t.foodDb.types[item.foodType]}</span>
          <span className="log-food-name">{item.foodName}</span>
          <span className="log-food-meta">{item.grams}g · {item.kcal.toFixed(0)}kcal</span>
        </div>
      ))}

      {log.extraWaterMl > 0 && (
        <div className="log-food-row">
          <span className="type-badge" style={{ background: "#d0e8f5", color: "#10507a" }}>💧</span>
          <span className="log-food-name">{t.log.extraWater}</span>
          <span className="log-food-meta">{log.extraWaterMl} ml</span>
        </div>
      )}

      {log.note && <div className="log-note">💬 {log.note}</div>}
      <PhotoStrip log={log} onPhotoClick={onPhotoClick} />
    </>
  );
}

function WaterCardBody({ log, t }) {
  const tw = t.water;
  return (
    <>
      <div className="log-card-header">
        <div>
          <div className="log-kind-label">💧 {tw.title}</div>
          <div className="log-time">{fmtTime(log.createdAt)}</div>
        </div>
        <div className="log-summary">
          <span className="log-summary-main water-val">{log.ml} ml</span>
          <span className="log-summary-sub">{tw.sources[log.source]}</span>
        </div>
      </div>
      {log.note && <div className="log-note">💬 {log.note}</div>}
    </>
  );
}

function WasteCardBody({ log, t, onPhotoClick }) {
  const tw = t.waste;
  const isPoop = log.wasteType === "poop";
  return (
    <>
      <div className="log-card-header">
        <div>
          <div className="log-kind-label">
            {isPoop ? "💩" : "💧"} {tw.types[log.wasteType]}
          </div>
          <div className="log-time">{fmtTime(log.createdAt)}</div>
        </div>
      </div>

      {isPoop && (
        <div className="log-detail-row">
          <span className="log-detail-chip">{tw.poop.colors[log.color]}</span>
          <span className="log-detail-chip">{tw.poop.consistencies[log.consistency]}</span>
        </div>
      )}

      {!isPoop && (
        <div className="log-detail-row">
          {log.clumps > 0 && <span className="log-detail-chip">x{log.clumps} {tw.pee.clumps}</span>}
          {log.diameter > 0 && <span className="log-detail-chip">⌀ {log.diameter} cm</span>}
          {log.color && <span className="log-detail-chip">{tw.pee.colors[log.color]}</span>}
        </div>
      )}

      {log.note && <div className="log-note">💬 {log.note}</div>}
      <PhotoStrip log={log} onPhotoClick={onPhotoClick} />
    </>
  );
}

function PhotoStrip({ log, onPhotoClick }) {
  // Support both old (photos: [dataUrl]) and new (photoIds: [driveRef]) formats
  const refs = log.photoIds || log.photos || [];
  if (!refs.length) return null;

  const handleClick = (ref) => {
    // Resolve to a displayable URL before opening lightbox
    if (ref.startsWith("data:")) { onPhotoClick(ref); return; }
    getPhotoUrl(ref).then(url => { if (url) onPhotoClick(url); });
  };

  return (
    <div className="log-photos">
      {refs.map((ref, i) => (
        <DriveImg key={i} photoRef={ref} className="log-photo"
          onClick={() => handleClick(ref)} />
      ))}
    </div>
  );
}


// ── HistoryPage ───────────────────────────────────────────────────────────────
export function HistoryPage({ t, logs, onDelete }) {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? logs : logs.filter(l => l.kind === filter);
  const grouped = filtered.reduce((acc, log) => {
    (acc[log.date] = acc[log.date] || []).push(log);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort().reverse();

  const filters = [
    { k: "all",   label: t.history.filterAll },
    { k: "meal",  label: t.history.filterMeal },
    { k: "water", label: t.history.filterWater },
    { k: "waste", label: t.history.filterWaste },
  ];

  return (
    <div>
      <div className="section-title">
        {t.history.title} <span className="section-sub">{t.history.sub}</span>
      </div>

      <div className="filter-tabs">
        {filters.map(({ k, label }) => (
          <button key={k} className={`filter-tab${filter === k ? " active" : ""}`}
            onClick={() => setFilter(k)}>{label}</button>
        ))}
      </div>

      {!dates.length ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <div className="empty-title">{t.history.noHistory}</div>
        </div>
      ) : dates.map(date => (
        <div key={date}>
          <div className="date-label">{date}</div>
          {grouped[date].map(log => (
            <LogCard key={log.id} log={log} t={t} onDelete={onDelete} />
          ))}
        </div>
      ))}
    </div>
  );
}
