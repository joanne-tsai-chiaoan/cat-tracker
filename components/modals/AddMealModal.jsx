// components/modals/AddMealModal.jsx

import { useState } from "react";
import { today } from "../../utils.js";
import { ModalShell, FormInput, PillSelector, PhotoPicker } from "../ui/index.jsx";

export function AddMealModal({ t, foods, initial, onSave, onClose }) {
  const [mealType, setMealType] = useState(initial?.mealType || "breakfast");
  const [items, setItems] = useState(initial?.items || []);
  const [extraWaterMl, setExtraWaterMl] = useState(initial?.extraWaterMl?.toString() || "");
  const [note, setNote] = useState(initial?.note || "");
  const [photos, setPhotos] = useState(initial?.photos || initial?.photoIds || []);
  const [addingFood, setAddingFood] = useState(false);
  const [addFoodType, setAddFoodType] = useState(foods[0]?.type || "");
  const [selFoodId, setSelFoodId] = useState(foods[0]?.id || "");
  const [grams, setGrams] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [editGrams, setEditGrams] = useState("");

  const foodsMap = Object.fromEntries(foods.map(f => [f.id, f]));

  const calcItem = (foodId, g) => {
    const food = foodsMap[foodId];
    if (!food) return null;
    return {
      foodId,
      foodName:     food.name,
      foodType:     food.type,
      foodSubtype:  food.subtype,
      grams:        g,
      kcal:         (food.kcalPer100g     * g) / 100,
      protein:      (food.proteinPer100g  * g) / 100,
      waterFromFood:((food.waterPer100g ?? 0) * g) / 100,
    };
  };

  const addItem = () => {
    const g = parseFloat(grams);
    if (!g || g <= 0 || !selFoodId) return;
    const item = calcItem(selFoodId, g);
    if (item) setItems(prev => [...prev, item]);
    setGrams("");
    setAddingFood(false);
  };

  const startEditItem = (i) => {
    setEditingIndex(i);
    setEditGrams(items[i].grams.toString());
  };

  const confirmEditItem = () => {
    const g = parseFloat(editGrams);
    if (!g || g <= 0) return;
    const updated = calcItem(items[editingIndex].foodId, g);
    if (updated) setItems(prev => prev.map((it, j) => j === editingIndex ? updated : it));
    setEditingIndex(null);
    setEditGrams("");
  };

  const totalKcal         = items.reduce((s, i) => s + i.kcal,         0);
  const totalProtein      = items.reduce((s, i) => s + i.protein,      0);
  const totalWaterFromFood = items.reduce((s, i) => s + i.waterFromFood, 0);
  const extraWater        = parseFloat(extraWaterMl) || 0;
  const totalWater        = totalWaterFromFood + extraWater;

  const handleSave = () => {
    if (!items.length) return;
    // Store only user inputs — nutrition is derived at read time from the food DB
    const cleanItems = items.map(({ foodId, grams }) => ({ foodId, grams }));
    onSave({ kind: "meal", date: today(), mealType, items: cleanItems, extraWaterMl: extraWater, note, photos });
  };

  return (
    <ModalShell
      title={initial ? (t.common.edit || "Edit") : t.log.addMeal}
      onClose={onClose}
      onSave={handleSave}
      saveLabel={t.log.save}
      closeLabel={t.common.close}
      saveDisabled={!items.length}
    >
      <PillSelector
        label={t.log.mealType}
        options={t.log.mealTypes}
        value={mealType}
        onChange={setMealType}
      />

      {/* Food items */}
      <div className="form-group">
        <label className="form-label">{t.log.addFood}</label>
        {items.map((item, i) => (
          <div key={i}>
            {editingIndex === i ? (
              <div className="meal-row meal-row--editing">
                <span className={`type-badge type-${item.foodType}`}>{t.foodDb.types[item.foodType]}</span>
                <span className="meal-row-name">{item.foodName}</span>
                <input
                  className="form-input meal-row-edit-input"
                  type="number" min="0" autoFocus
                  value={editGrams}
                  onChange={e => setEditGrams(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") confirmEditItem(); if (e.key === "Escape") setEditingIndex(null); }}
                />
                <button className="btn btn-primary btn-sm" onClick={confirmEditItem}>✓</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditingIndex(null)}>✕</button>
              </div>
            ) : (
              <div className="meal-row meal-row--tappable" onClick={() => startEditItem(i)}>
                <span className={`type-badge type-${item.foodType}`}>{t.foodDb.types[item.foodType]}</span>
                <span className="meal-row-name">{item.foodName}</span>
                <span className="meal-row-meta">{item.grams}g · {item.kcal.toFixed(0)}kcal</span>
                <button className="del-btn" onClick={e => { e.stopPropagation(); setItems(prev => prev.filter((_, j) => j !== i)); }}>✕</button>
              </div>
            )}
          </div>
        ))}

        {addingFood ? (
          <div className="add-food-box">
            {/* Food type filter */}
            <div className="food-type-filter">
              {Object.entries(t.foodDb.types).map(([type, label]) => (
                <button
                  key={type}
                  className={`food-type-pill${addFoodType === type ? " active" : ""}`}
                  onClick={() => {
                    setAddFoodType(type);
                    const first = foods.find(f => f.type === type);
                    if (first) setSelFoodId(first.id);
                  }}
                >{label}</button>
              ))}
            </div>
            <div className="form-group" style={{ marginBottom: 8 }}>
              <select className="form-input form-select" value={selFoodId}
                onChange={e => setSelFoodId(e.target.value)}>
                {foods.filter(f => f.type === addFoodType).length === 0
                  ? <option value="">{t.log.noFood}</option>
                  : foods.filter(f => f.type === addFoodType).map(f => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.kcalPer100g} kcal/100g)
                      </option>
                    ))
                }
              </select>
            </div>
            <div className="form-row">
              <input className="form-input" style={{ flex: 1 }} type="number" min="0"
                placeholder={t.log.gramsPlaceholder}
                value={grams} onChange={e => setGrams(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addItem()} />
              <button className="btn btn-primary btn-sm" onClick={addItem}>Add</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setAddingFood(false)}>✕</button>
            </div>
          </div>
        ) : (
          <button className="add-food-btn"
            onClick={() => { if (foods.length > 0) setAddingFood(true); }}>
            ＋ {t.log.addFood}
            {foods.length === 0 && <span style={{ fontSize: 11, color: "var(--text-muted)" }}> ({t.log.noFood})</span>}
          </button>
        )}
      </div>

      <FormInput
        label={t.log.extraWater}
        type="number" min="0"
        placeholder={t.log.extraWaterPlaceholder}
        value={extraWaterMl}
        onChange={e => setExtraWaterMl(e.target.value)}
      />

      {items.length > 0 && (
        <div className="totals-row">
          <div className="total-chip">
            <span>{t.log.totalKcal}</span>
            <strong>{totalKcal.toFixed(0)} kcal</strong>
          </div>
          <div className="total-chip">
            <span>{t.log.totalProtein}</span>
            <strong>{totalProtein.toFixed(1)} g</strong>
          </div>
          <div className="total-chip">
            <span>{t.log.totalWater}</span>
            <strong>{totalWater.toFixed(0)} ml</strong>
          </div>
        </div>
      )}

      <FormInput
        label={t.log.note}
        placeholder={t.log.notePlaceholder}
        value={note}
        onChange={e => setNote(e.target.value)}
      />

      <PhotoPicker photos={photos} onChange={setPhotos} label={t.log.photos} />
    </ModalShell>
  );
}
