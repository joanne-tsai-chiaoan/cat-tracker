// components/modals/FoodProfileModals.jsx

import { useRef } from "react";
import { readFileAsDataUrl } from "../../utils.js";
import { ModalShell, FormInput, PillSelector, useFormState } from "../ui/index.jsx";

// ── AddFoodModal ──────────────────────────────────────────────────────────────

export function AddFoodModal({ t, initial, onSave, onClose }) {
  const [form, set, patch] = useFormState(initial || {
    name: "", brand: "", type: "wet", subtype: "pate",
    kcalPer100g: "", proteinPer100g: "", waterPer100g: "",
  });

  const handleTypeChange = (type) => {
    patch({ type, subtype: Object.keys(t.foodDb.subtypes[type])[0] });
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

  return (
    <ModalShell
      title={initial ? t.common.edit : t.foodDb.add}
      onClose={onClose}
      onSave={handleSave}
      saveLabel={t.foodDb.save}
      closeLabel={t.foodDb.cancel}
      saveDisabled={!form.name || !form.kcalPer100g}
    >
      <FormInput
        label={t.foodDb.name}
        placeholder={t.foodDb.namePlaceholder}
        value={form.name}
        onChange={e => set("name", e.target.value)}
      />
      <FormInput
        label={t.foodDb.brand}
        placeholder={t.foodDb.brandPlaceholder}
        value={form.brand}
        onChange={e => set("brand", e.target.value)}
      />

      <div className="form-row">
        <FormInput
          as="select" className="form-select"
          label={t.foodDb.type}
          value={form.type}
          onChange={e => handleTypeChange(e.target.value)}
        >
          {Object.entries(t.foodDb.types).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </FormInput>
        <FormInput
          as="select" className="form-select"
          label={t.foodDb.subtype}
          value={form.subtype}
          onChange={e => set("subtype", e.target.value)}
        >
          {Object.entries(t.foodDb.subtypes[form.type] || {}).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </FormInput>
      </div>

      <div className="form-row">
        <FormInput
          label={t.foodDb.kcalPer100g}
          type="number" min="0" placeholder="85"
          value={form.kcalPer100g}
          onChange={e => set("kcalPer100g", e.target.value)}
        />
        <FormInput
          label={t.foodDb.proteinPer100g}
          type="number" min="0" placeholder="10.2"
          value={form.proteinPer100g}
          onChange={e => set("proteinPer100g", e.target.value)}
        />
      </div>

      <FormInput
        label={t.foodDb.waterPer100g}
        hint={t.foodDb.waterPer100gHint}
        type="number" min="0" max="100" placeholder="75"
        value={form.waterPer100g}
        onChange={e => set("waterPer100g", e.target.value)}
      />
    </ModalShell>
  );
}

// ── ProfileModal ──────────────────────────────────────────────────────────────

export function ProfileModal({ t, profile, onSave, onClose }) {
  const [form, set] = useFormState(profile);
  const photoRef    = useRef();

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    set("photo", await readFileAsDataUrl(file));
  };

  return (
    <ModalShell
      title={t.catProfile.title}
      onClose={onClose}
      onSave={() => onSave(form)}
      saveLabel={t.catProfile.save}
      closeLabel={t.common.close}
    >
      <div className="profile-photo-wrap">
        <div className="profile-photo" onClick={() => photoRef.current.click()}>
          {form.photo ? <img src={form.photo} alt="cat" /> : <span>🐱</span>}
          <div className="profile-photo-overlay">{t.catProfile.changePhoto}</div>
        </div>
        <input ref={photoRef} type="file" accept="image/*" capture="environment"
          style={{ display: "none" }} onChange={handlePhoto} />
      </div>

      <FormInput
        label={t.catProfile.name}
        placeholder={t.catProfile.namePlaceholder}
        value={form.name}
        onChange={e => set("name", e.target.value)}
      />

      <div className="form-row">
        <FormInput
          label={t.catProfile.breed}
          placeholder={t.catProfile.breedPlaceholder}
          value={form.breed}
          onChange={e => set("breed", e.target.value)}
        />
        <FormInput
          label={t.catProfile.weight}
          type="number" min="0" step="0.1"
          placeholder={t.catProfile.weightPlaceholder}
          value={form.weight}
          onChange={e => set("weight", e.target.value)}
        />
      </div>
    </ModalShell>
  );
}
