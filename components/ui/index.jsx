// components/ui/index.jsx — shared UI primitives and hooks

import { useState, useEffect, useRef, useCallback } from "react";
import { readFileAsDataUrl } from "../../utils.js";
import { getPhotoUrl } from "../../storage.js";

// ── DriveImg ──────────────────────────────────────────────────────────────────
// Renders a photo from either a data URL (local) or a Drive file reference.
// Shows a grey placeholder while loading.
export function DriveImg({ photoRef, className, onClick }) {
  const [src, setSrc] = useState(() => photoRef?.startsWith("data:") ? photoRef : null);

  useEffect(() => {
    if (!photoRef || photoRef.startsWith("data:")) return;
    setSrc(null);
    getPhotoUrl(photoRef).then(url => setSrc(url || null));
  }, [photoRef]);

  if (!src) return <div className={`photo-placeholder${className ? " " + className : ""}`} />;
  return <img src={src} alt="" className={className} onClick={onClick} />;
}

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
        <input ref={inputRef} type="file" accept="image/*"
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

// ── ModalShell ────────────────────────────────────────────────────────────────
// Wraps every modal: overlay click-to-close, handle bar, title, save + close buttons.
export function ModalShell({ title, onClose, onSave, saveLabel, closeLabel, saveDisabled, saveColor, children }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-title">{title}</div>
        {children}
        <button className="btn btn-primary btn-full"
          style={saveColor ? { background: saveColor } : undefined}
          onClick={onSave} disabled={saveDisabled}>
          {saveLabel}
        </button>
        <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={onClose}>
          {closeLabel}
        </button>
      </div>
    </div>
  );
}

// ── FormInput ─────────────────────────────────────────────────────────────────
// form-group + label + input/select/textarea in one component.
// Pass `as="select"` or `as="textarea"` to render different elements.
// Pass `className` for extra classes (e.g. "form-select" for <select>).
// Pass `hint` for a helper paragraph below the field.
// Children are forwarded to the element (for <select> options).
export function FormInput({ label, hint, as: Tag = "input", className = "", children, ...props }) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <Tag className={`form-input${className ? ` ${className}` : ""}`} {...props}>
        {children}
      </Tag>
      {hint && <p className="form-hint">{hint}</p>}
    </div>
  );
}

// ── PillSelector ──────────────────────────────────────────────────────────────
// form-group + label + pill-row of toggle buttons.
// `options` is { key: label }. `colorClass` appended to "pill pill-{color}".
// Omit colorClass for the plain "pill" style (no colour variant).
export function PillSelector({ label, options, value, onChange, colorClass }) {
  const base = colorClass ? `pill pill-${colorClass}` : "pill";
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <div className="pill-row">
        {Object.entries(options).map(([k, v]) => (
          <button key={k}
            className={`${base}${value === k ? " pill-active" : ""}`}
            onClick={() => onChange(k)}>{v}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      {subtitle && <div className="empty-sub">{subtitle}</div>}
    </div>
  );
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle }) {
  return (
    <div className="section-title">
      {title}{subtitle && <span className="section-sub"> {subtitle}</span>}
    </div>
  );
}

// ── TabSelector ───────────────────────────────────────────────────────────────
// Generic tab bar. `tabs` is [[key, label], ...].
// containerClass / itemClass map to the caller's CSS (e.g. "stats-tabs" / "stats-tab").
export function TabSelector({ tabs, active, onChange, containerClass, itemClass }) {
  return (
    <div className={containerClass}>
      {tabs.map(([k, label]) => (
        <button key={k} className={`${itemClass}${active === k ? " active" : ""}`}
          onClick={() => onChange(k)}>{label}
        </button>
      ))}
    </div>
  );
}

// ── TypeBadge ─────────────────────────────────────────────────────────────────
export function TypeBadge({ type, label }) {
  return <span className={`type-badge type-${type}`}>{label}</span>;
}

// ── useFormState ──────────────────────────────────────────────────────────────
// Flat-object form state with a stable single-key setter and a multi-key patch.
// Returns [form, set(key, value), patch(partialObject)].
export function useFormState(initial) {
  const [form, setForm] = useState(initial);
  const set   = useCallback((k, v)   => setForm(prev => ({ ...prev, [k]: v })),    []);
  const patch  = useCallback(partial => setForm(prev => ({ ...prev, ...partial })), []);
  return [form, set, patch];
}

// ── useConfirmDelete ──────────────────────────────────────────────────────────
// Two-tap delete pattern: first tap arms (shows confirm UI), second tap fires onDelete(id).
// Auto-disarms after `delay` ms if the second tap does not arrive.
// Returns { armed, trigger }.
export function useConfirmDelete(id, onDelete, delay = 2500) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), delay);
    return () => clearTimeout(t);
  }, [armed, delay]);
  const trigger = useCallback(() => {
    if (armed) onDelete(id);
    else setArmed(true);
  }, [armed, id, onDelete]);
  return { armed, trigger };
}

// ── useLongPress ──────────────────────────────────────────────────────────────
// Timer-based long-press for touch, plus onContextMenu for desktop right-click.
// Returns event handlers + `pressing` boolean for progressive visual feedback.
// CSS on the element must include: -webkit-touch-callout: none; user-select: none;
export function useLongPress(onLongPress, delay = 550) {
  const timer    = useRef(null);
  const hasFired = useRef(false);
  const [pressing, setPressing] = useState(false);

  const clearTimer = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  }, []);

  const cancel = useCallback(() => {
    clearTimer();
    setPressing(false);
    hasFired.current = false;
  }, [clearTimer]);


  const start = useCallback(() => {
    cancel();
    setPressing(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setPressing(false);
      hasFired.current = true;
      if (navigator.vibrate) navigator.vibrate(50);
      onLongPress();
    }, delay);
  }, [onLongPress, delay, cancel]);

  return {
    pressing,
    onTouchStart:  start,
    onTouchEnd:    cancel,
    onTouchCancel: cancel,
    onTouchMove:   cancel,
    // hasFired prevents double-fire: OS fires contextmenu ~500ms, timer fires
    // at 550ms — whichever comes first wins; clearTimer() preserves hasFired.
    onContextMenu: (e) => {
      e.preventDefault();
      if (hasFired.current) return;
      hasFired.current = true;
      clearTimer();
      setPressing(false);
      if (navigator.vibrate) navigator.vibrate(50);
      onLongPress();
    },
  };
}

// ── ActionSheet ───────────────────────────────────────────────────────────────
// iOS-style bottom action sheet. items = [{ label, icon?, danger?, onClick }]
export function ActionSheet({ items, onClose }) {
  return (
    <div className="action-sheet-overlay" onClick={onClose}>
      <div className="action-sheet" onClick={e => e.stopPropagation()}>
        {items.map(({ label, icon, danger, onClick }) => (
          <button key={label}
            className={`action-sheet-item${danger ? " danger" : ""}`}
            onClick={() => { onClick(); onClose(); }}>
            {icon && <span className="action-sheet-icon">{icon}</span>}
            {label}
          </button>
        ))}
        <button className="action-sheet-cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// ── CenterMenu ────────────────────────────────────────────────────────────────
// Centered overlay menu for long-press actions. items = [{ label, icon?, danger?, disabled?, onClick }]
export function CenterMenu({ items, onClose }) {
  return (
    <div className="center-menu-overlay" onClick={onClose}>
      <div className="center-menu" onClick={e => e.stopPropagation()}>
        {items.map(({ label, icon, danger, disabled, onClick }) => (
          <button key={label}
            className={`center-menu-item${danger ? " danger" : ""}${disabled ? " disabled" : ""}`}
            disabled={disabled}
            onClick={() => { if (!disabled) { onClick(); onClose(); } }}>
            {icon && <span className="center-menu-icon">{icon}</span>}
            {label}
          </button>
        ))}
        <button className="center-menu-cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
