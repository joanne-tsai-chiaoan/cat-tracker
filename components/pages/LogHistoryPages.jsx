// components/pages/LogHistoryPages.jsx

import { useState } from "react";
import { fmtTime } from "../../utils.js";
import { Lightbox, DriveImg, SectionHeader, EmptyState, TabSelector, TypeBadge, CenterMenu, useLongPress } from "../ui/index.jsx";
import { getPhotoUrl } from "../../storage.js";

// ── LogPage ───────────────────────────────────────────────────────────────────
export function LogPage({ t, todayLogs, todayKcal, todayWater, todayProtein, onTrash, onPatch }) {
  return (
    <div>
      <SectionHeader title={t.log.title} subtitle={t.log.sub} />
      {!todayLogs.length
        ? <EmptyState icon="🐾" title={t.log.noLog} subtitle={t.log.noLogSub} />
        : todayLogs.map(log => <LogCard key={log.id} log={log} t={t} onTrash={onTrash} onPatch={onPatch} />)
      }
    </div>
  );
}

// ── LogCard ───────────────────────────────────────────────────────────────────
export function LogCard({ log, t, onTrash, onPatch }) {
  const [lightbox,  setLightbox]  = useState(null);
  const [menu,      setMenu]      = useState(false);
  const [editMode,  setEditMode]  = useState(false);
  const [editGrams, setEditGrams] = useState({});
  const [editMl,    setEditMl]    = useState(0);

  const { pressing, ...longPressHandlers } = useLongPress(() => setMenu(true));

  const enterEdit = () => {
    if (log.kind === "meal") {
      const initial = {};
      log.items.forEach((item, i) => { initial[i] = String(item.grams); });
      setEditGrams(initial);
    }
    if (log.kind === "water") setEditMl(String(log.ml));
    setEditMode(true);
  };

  const saveEdit = () => {
    if (!editMode) return;
    let updated = log;
    if (log.kind === "meal") {
      const newItems = log.items.map((item, i) => {
        const ng = parseFloat(editGrams[i]) || item.grams;
        if (ng === item.grams) return item;
        const ratio = ng / item.grams;
        return {
          ...item,
          grams: ng,
          kcal:          +(item.kcal          * ratio).toFixed(2),
          protein:       +(item.protein       * ratio).toFixed(2),
          waterFromFood: +(item.waterFromFood * ratio).toFixed(2),
        };
      });
      const totalKcal         = newItems.reduce((s, i) => s + i.kcal,          0);
      const totalProtein      = newItems.reduce((s, i) => s + i.protein,       0);
      const totalWaterFromFood= newItems.reduce((s, i) => s + i.waterFromFood, 0);
      const totalWater        = totalWaterFromFood + (log.extraWaterMl || 0);
      updated = { ...log, items: newItems, totalKcal, totalProtein, totalWater, totalWaterFromFood };
    }
    if (log.kind === "water") {
      const ml = parseFloat(editMl) || log.ml;
      updated = { ...log, ml };
    }
    onPatch(updated);
    setEditMode(false);
  };

  return (
    <>
      {editMode && <div className="edit-backdrop" onClick={saveEdit} />}

      <div
        className={`log-card kind-${log.kind}${pressing ? " log-card--pressing" : ""}${editMode ? " log-card--editing" : ""}`}
        {...(editMode ? {} : longPressHandlers)}
      >
        {log.kind === "meal" && (
          <MealCardBody
            log={log} t={t}
            onPhotoClick={setLightbox}
            editMode={editMode}
            editGrams={editGrams}
            onEditGrams={(i, v) => setEditGrams(prev => ({ ...prev, [i]: v }))}
          />
        )}
        {log.kind === "water" && (
          <WaterCardBody
            log={log} t={t}
            editMode={editMode}
            editMl={editMl}
            onEditMl={setEditMl}
          />
        )}
        {log.kind === "waste" && (
          <WasteCardBody log={log} t={t} onPhotoClick={setLightbox} />
        )}

        <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
      </div>

      {menu && (
        <CenterMenu
          onClose={() => setMenu(false)}
          items={[
            { label: t.common.edit,   icon: "✏️",  onClick: enterEdit },
            { label: t.common.delete, icon: "🗑",  danger: true, onClick: () => onTrash(log) },
            { label: t.trash?.changeTime ?? "Change Time", icon: "🕐", disabled: true, onClick: () => {} },
          ]}
        />
      )}
    </>
  );
}

function MealCardBody({ log, t, onPhotoClick, editMode, editGrams, onEditGrams }) {
  const isSingle   = log.items.length === 1;
  const totalGrams = log.items.reduce((s, i) => s + i.grams, 0);
  const photoRefs  = log.photoIds || log.photos || [];

  const openPhoto = (ref) => {
    if (ref.startsWith("data:")) { onPhotoClick(ref); return; }
    getPhotoUrl(ref).then(url => { if (url) onPhotoClick(url); });
  };

  return (
    <>
      <div className="log-card-header">
        <div className="log-card-left">
          {isSingle ? (
            <div className="log-card-title-row">
              <TypeBadge type={log.items[0].foodType} label={t.foodDb.types[log.items[0].foodType]} />
              <span className="log-kind-label">{log.items[0].foodName}</span>
            </div>
          ) : (
            <div className="log-kind-label">{t.log.mealTypes[log.mealType] || log.mealType}</div>
          )}
          <div className="log-card-meta-row">
            <span className="log-time">{fmtTime(log.createdAt)}</span>
            <span className="log-summary-sub">🔥{log.totalKcal.toFixed(0)} · 💪{log.totalProtein.toFixed(1)}g · 💧{log.totalWater.toFixed(0)}ml</span>
          </div>
        </div>
        {photoRefs.length > 0 && (
          <div className="log-card-photo">
            <DriveImg photoRef={photoRefs[0]} className="log-card-photo-img"
              onClick={() => openPhoto(photoRefs[0])} />
            {photoRefs.length > 1 && <span className="log-card-photo-count">+{photoRefs.length - 1}</span>}
          </div>
        )}
        <div className="log-summary">
          {isSingle && editMode ? (
            <input
              className="inline-edit-input"
              type="number" inputMode="decimal" min="0"
              value={editGrams[0] ?? totalGrams}
              onChange={e => onEditGrams(0, e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="log-summary-main">{totalGrams}g</span>
          )}
        </div>
      </div>

      {!isSingle && log.items.map((item, i) => (
        <div key={i} className={`log-food-row${editMode ? " log-food-row--editing" : ""}`}>
          <TypeBadge type={item.foodType} label={t.foodDb.types[item.foodType]} />
          <span className="log-food-name">{item.foodName}</span>
          {editMode ? (
            <input
              className="inline-edit-input"
              type="number" inputMode="decimal" min="0"
              value={editGrams[i] ?? item.grams}
              onChange={e => onEditGrams(i, e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="log-food-meta">{item.grams}g · {item.kcal.toFixed(0)}kcal</span>
          )}
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
    </>
  );
}

function WaterCardBody({ log, t, editMode, editMl, onEditMl }) {
  const tw = t.water;
  return (
    <>
      <div className="log-card-header">
        <div className="log-card-left">
          <div className="log-card-title-row">
            <span className={`type-badge source-${log.source}`}>{tw.sources[log.source]}</span>
            <span className="log-kind-label">💧 {tw.title}</span>
          </div>
          <div className="log-card-meta-row">
            <span className="log-time">{fmtTime(log.createdAt)}</span>
          </div>
        </div>
        <div className="log-summary">
          {editMode ? (
            <input
              className="inline-edit-input"
              type="number" inputMode="decimal" min="0"
              value={editMl}
              onChange={e => onEditMl(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="log-summary-main water-val">{log.ml} ml</span>
          )}
        </div>
      </div>
      {log.note && <div className="log-note">💬 {log.note}</div>}
    </>
  );
}

function WasteCardBody({ log, t, onPhotoClick }) {
  const tw = t.waste;
  const isPoop = log.wasteType === "poop";
  const photoRefs = log.photoIds || log.photos || [];

  const openPhoto = (ref) => {
    if (ref.startsWith("data:")) { onPhotoClick(ref); return; }
    getPhotoUrl(ref).then(url => { if (url) onPhotoClick(url); });
  };

  return (
    <>
      <div className="log-card-header">
        <div className="log-card-left">
          <div className="log-kind-label">
            {isPoop ? "💩" : "💧"} {tw.types[log.wasteType]}
          </div>
          <div className="log-card-meta-row">
            <span className="log-time">{fmtTime(log.createdAt)}</span>
          </div>
        </div>
        {photoRefs.length > 0 && (
          <div className="log-card-photo">
            <DriveImg photoRef={photoRefs[0]} className="log-card-photo-img"
              onClick={() => openPhoto(photoRefs[0])} />
            {photoRefs.length > 1 && <span className="log-card-photo-count">+{photoRefs.length - 1}</span>}
          </div>
        )}
      </div>

      {isPoop && (
        <div className="log-detail-row">
          <span className="log-detail-chip">{tw.poop.colors[log.color]}</span>
          <span className="log-detail-chip">{tw.poop.consistencies[log.consistency]}</span>
        </div>
      )}

      {!isPoop && (
        <div className="log-detail-row">
          {log.clumps   > 0 && <span className="log-detail-chip">x{log.clumps} {tw.pee.clumps}</span>}
          {log.diameter > 0 && <span className="log-detail-chip">⌀ {log.diameter} cm</span>}
          {log.color       && <span className="log-detail-chip">{tw.pee.colors[log.color]}</span>}
        </div>
      )}

      {log.note && <div className="log-note">💬 {log.note}</div>}
    </>
  );
}

// ── HistoryPage ───────────────────────────────────────────────────────────────
export function HistoryPage({ t, logs, onTrash, onPatch }) {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? logs : logs.filter(l => l.kind === filter);
  const grouped  = filtered.reduce((acc, log) => {
    (acc[log.date] = acc[log.date] || []).push(log);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort().reverse();

  return (
    <div>
      <SectionHeader title={t.history.title} subtitle={t.history.sub} />

      <TabSelector
        tabs={[
          ["all",   t.history.filterAll],
          ["meal",  t.history.filterMeal],
          ["water", t.history.filterWater],
          ["waste", t.history.filterWaste],
        ]}
        active={filter}
        onChange={setFilter}
        containerClass="filter-tabs"
        itemClass="filter-tab"
      />

      {!dates.length
        ? <EmptyState icon="📋" title={t.history.noHistory} />
        : dates.map(date => (
            <div key={date}>
              <div className="date-label">{date}</div>
              {grouped[date].map(log => (
                <LogCard key={log.id} log={log} t={t} onTrash={onTrash} onPatch={onPatch} />
              ))}
            </div>
          ))
      }
    </div>
  );
}
