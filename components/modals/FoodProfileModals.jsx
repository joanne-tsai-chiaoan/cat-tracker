// components/modals/AddFoodModal.jsx + ProfileModal.jsx

import { useState, useRef } from "react";
import { readFileAsDataUrl } from "../../utils.js";

export function AddFoodModal({ t, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    name: "", brand: "", type: "wet", subtype: "pate",
    kcalPer100g: "", proteinPer100g: "", waterPer100g: "",
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleTypeChange = (type) => {
    const firstSubtype = Object.keys(t.foodDb.subtypes[type])[0];
    setForm(prev => ({ ...prev, type, subtype: firstSubtype }));
  };

  const handleSave = () => {
    if (!form.name || !form.kcalPer100g) return;
    onSave({
      ...form,
      kcalPer100g:    parseFloat(form.kcalPer100g)    || 0,
      proteinPer100g: parseFloat(form.proteinPer100g) || 0,
      waterPer100g:   parseFloat(form.waterPer100g)   || 0,
    });
  };

  const subtypeOptions = t.foodDb.subtypes[form.type] || {};

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-title">{initial ? t.common.edit : t.foodDb.add}</div>

        <div className="form-group">
          <label className="form-label">{t.foodDb.name}</label>
          <input className="form-input" placeholder={t.foodDb.namePlaceholder}
            value={form.name} onChange={e => set("name", e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">{t.foodDb.brand}</label>
          <input className="form-input" placeholder={t.foodDb.brandPlaceholder}
            value={form.brand} onChange={e => set("brand", e.target.value)} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t.foodDb.type}</label>
            <select className="form-input form-select"
              value={form.type} onChange={e => handleTypeChange(e.target.value)}>
              {Object.entries(t.foodDb.types).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{t.foodDb.subtype}</label>
            <select className="form-input form-select"
              value={form.subtype} onChange={e => set("subtype", e.target.value)}>
              {Object.entries(subtypeOptions).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t.foodDb.kcalPer100g}</label>
            <input className="form-input" type="number" min="0" placeholder="85"
              value={form.kcalPer100g} onChange={e => set("kcalPer100g", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">{t.foodDb.proteinPer100g}</label>
            <input className="form-input" type="number" min="0" placeholder="10.2"
              value={form.proteinPer100g} onChange={e => set("proteinPer100g", e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{t.foodDb.waterPer100g}</label>
          <input className="form-input" type="number" min="0" max="100" placeholder="75"
            value={form.waterPer100g} onChange={e => set("waterPer100g", e.target.value)} />
          <p className="form-hint">{t.foodDb.waterPer100gHint}</p>
        </div>

        <button className="btn btn-primary btn-full" onClick={handleSave}
          disabled={!form.name || !form.kcalPer100g}>
          {t.foodDb.save}
        </button>
        <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={onClose}>
          {t.foodDb.cancel}
        </button>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// ProfileModal

export function ProfileModal({ t, profile, onSave, onClose }) {
  const [form, setForm] = useState(profile);
  const photoRef = useRef();
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    set("photo", dataUrl);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-title">{t.catProfile.title}</div>

        <div className="profile-photo-wrap">
          <div className="profile-photo" onClick={() => photoRef.current.click()}>
            {form.photo ? <img src={form.photo} alt="cat" /> : <span>🐱</span>}
            <div className="profile-photo-overlay">{t.catProfile.changePhoto}</div>
          </div>
          <input ref={photoRef} type="file" accept="image/*" capture="environment"
            style={{ display: "none" }} onChange={handlePhoto} />
        </div>

        <div className="form-group">
          <label className="form-label">{t.catProfile.name}</label>
          <input className="form-input" placeholder={t.catProfile.namePlaceholder}
            value={form.name} onChange={e => set("name", e.target.value)} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t.catProfile.breed}</label>
            <input className="form-input" placeholder={t.catProfile.breedPlaceholder}
              value={form.breed} onChange={e => set("breed", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">{t.catProfile.weight}</label>
            <input className="form-input" type="number" min="0" step="0.1"
              placeholder={t.catProfile.weightPlaceholder}
              value={form.weight} onChange={e => set("weight", e.target.value)} />
          </div>
        </div>

        <button className="btn btn-primary btn-full" onClick={() => onSave(form)}>
          {t.catProfile.save}
        </button>
        <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={onClose}>
          {t.common.close}
        </button>
      </div>
    </div>
  );
}
