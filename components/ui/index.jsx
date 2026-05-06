// components/ui/index.jsx — shared UI primitives

import { useRef } from "react";
import { readFileAsDataUrl } from "../../utils.js";

// ── PhotoPicker ───────────────────────────────────────────────────────────────
export function PhotoPicker({ photos, onChange, label }) {
  const inputRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    onChange([...photos, dataUrl]);
    e.target.value = "";
  };

  const remove = (i) => onChange(photos.filter((_, j) => j !== i));

  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <div className="photo-row">
        {photos.map((p, i) => (
          <div key={i} className="photo-thumb-wrap">
            <img src={p} alt="" className="photo-thumb" />
            <button className="photo-del" onClick={() => remove(i)}>✕</button>
          </div>
        ))}
        <button className="photo-add-btn" onClick={() => inputRef.current.click()}>📷</button>
        <input ref={inputRef} type="file" accept="image/*" capture="environment"
          style={{ display: "none" }} onChange={handleFile} />
      </div>
    </div>
  );
}

// ── PieChart ──────────────────────────────────────────────────────────────────
export function PieChart({ slices }) {
  // slices: [{ label, value, color }]
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (!total) return null;

  const R = 58, cx = 70, cy = 70;
  let cumAngle = -90;
  const paths = slices
    .filter(sl => sl.value > 0)
    .map(sl => {
      const pct = sl.value / total;
      const angle = pct * 360;
      const start = cumAngle; cumAngle += angle;
      const s = (start * Math.PI) / 180;
      const e = ((start + angle) * Math.PI) / 180;
      const x1 = cx + R * Math.cos(s), y1 = cy + R * Math.sin(s);
      const x2 = cx + R * Math.cos(e), y2 = cy + R * Math.sin(e);
      return { ...sl, pct, path: `M${cx},${cy} L${x1},${y1} A${R},${R} 0 ${angle > 180 ? 1 : 0} 1 ${x2},${y2} Z` };
    });

  return (
    <div className="pie-wrap">
      <svg width="140" height="140" viewBox="0 0 140 140" style={{ flexShrink: 0 }}>
        {paths.map((p, i) => (
          <path key={i} d={p.path} fill={p.color} stroke="white" strokeWidth="2" />
        ))}
      </svg>
      <div className="pie-legend">
        {paths.map((p, i) => (
          <div key={i} className="legend-item">
            <span className="legend-dot" style={{ background: p.color }} />
            <span>{p.label}</span>
            <span className="legend-pct">{(p.pct * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── WeeklyBarChart ────────────────────────────────────────────────────────────
export function WeeklyBarChart({ days, color = "var(--caramel)" }) {
  // days: [{ label, value }]
  const max = Math.max(...days.map(d => d.value), 1);
  return (
    <div className="bar-chart">
      {days.map((d, i) => {
        const h = (d.value / max) * 80;
        return (
          <div key={i} className="bar-col">
            <div className="bar-val">{d.value > 0 ? Math.round(d.value) : ""}</div>
            <div className="bar-track">
              <div className="bar-fill"
                style={{ height: `${h}px`, background: d.value > 0 ? color : "var(--latte)" }} />
            </div>
            <div className="bar-day">{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
export function Lightbox({ src, onClose }) {
  if (!src) return null;
  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose}>✕</button>
      <img src={src} alt="" className="lightbox-img" onClick={e => e.stopPropagation()} />
    </div>
  );
}

// ── ConfirmDelete ─────────────────────────────────────────────────────────────
export function ConfirmDelete({ label, onConfirm, onCancel }) {
  return (
    <>
      <span className="confirm-text">{label}</span>
      <button className="btn btn-danger btn-sm" onClick={onConfirm}>✓</button>
      <button className="btn btn-ghost btn-sm" onClick={onCancel}>✕</button>
    </>
  );
}
