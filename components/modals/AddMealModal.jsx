// components/modals/AddMealModal.jsx

import { useState } from "react";
import { today } from "../../utils.js";
import { PhotoPicker } from "../ui/index.jsx";

export function AddMealModal({ t, foods, onSave, onClose }) {
  const [mealType, setMealType] = useState("breakfast");
  const [items, setItems] = useState([]);
  const [extraWaterMl, setExtraWaterMl] = useState("");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState([]);
  const [addingFood, setAddingFood] = useState(false);
  const [selFoodId, setSelFoodId] = useState(foods[0]?.id || "");
  const [grams, setGrams] = useState("");

  // Build a map for quick lookup
  const foodsMap = Object.fromEntries(foods.map(f => [f.id, f]));

  const calcItem = (foodId, g) => {
    const food = foodsMap[foodId];
    if (!food) return null;
    return {
      foodId,
      foodName: food.name,
      foodType: food.type,
      foodSubtype: food.subtype,
      grams: g,
      kcal: (food.kcalPer100g * g) / 100,
      protein: (food.proteinPer100g * g) / 100,
      waterFromFood: ((food.waterPer100g ?? 0) * g) / 100,
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

  const totalKcal    = items.reduce((s, i) => s + i.kcal, 0);
  const totalProtein = items.reduce((s, i) => s + i.protein, 0);
  const totalWaterFromFood = items.reduce((s, i) => s + i.waterFromFood, 0);
  const extraWater   = parseFloat(extraWaterMl) || 0;
  const totalWater   = totalWaterFromFood + extraWater;

  const handleSave = () => {
    if (!items.length) return;
    onSave({
      kind: "meal",
      date: today(),
      mealType,
      items,
      totalKcal,
      totalProtein,
      totalWaterFromFood,
      extraWaterMl: extraWater,
      totalWater,
      note,
      photos,
    });
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-title">{t.log.addMeal}</div>

        {/* Meal type */}
        <div className="form-group">
          <label className="form-label">{t.log.mealType}</label>
          <div className="pill-row">
            {Object.entries(t.log.mealTypes).map(([k, v]) => (
              <button key={k} className={`pill${mealType === k ? " pill-active" : ""}`}
                onClick={() => setMealType(k)}>{v}</button>
            ))}
          </div>
        </div>

        {/* Food items */}
        <div className="form-group">
          <label className="form-label">{t.log.addFood}</label>
          {items.map((item, i) => (
            <div key={i} className="meal-row">
              <span className={`type-badge type-${item.foodType}`}>{t.foodDb.types[item.foodType]}</span>
              <span className="meal-row-name">{item.foodName}</span>
              <span className="meal-row-meta">{item.grams}g · {item.kcal.toFixed(0)}kcal</span>
              <button className="del-btn" onClick={() => setItems(prev => prev.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}

          {addingFood ? (
            <div className="add-food-box">
              <div className="form-group" style={{ marginBottom: 8 }}>
                <select className="form-input form-select" value={selFoodId}
                  onChange={e => setSelFoodId(e.target.value)}>
                  {foods.length === 0
                    ? <option value="">{t.log.noFood}</option>
                    : foods.map(f => (
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

        {/* Extra water */}
        <div className="form-group">
          <label className="form-label">{t.log.extraWater}</label>
          <input className="form-input" type="number" min="0"
            placeholder={t.log.extraWaterPlaceholder}
            value={extraWaterMl} onChange={e => setExtraWaterMl(e.target.value)} />
        </div>

        {/* Totals */}
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

        {/* Note */}
        <div className="form-group">
          <label className="form-label">{t.log.note}</label>
          <input className="form-input" placeholder={t.log.notePlaceholder}
            value={note} onChange={e => setNote(e.target.value)} />
        </div>

        {/* Photos */}
        <PhotoPicker photos={photos} onChange={setPhotos} label={t.log.photos} />

        <button className="btn btn-primary btn-full" onClick={handleSave} disabled={!items.length}>
          {t.log.save}
        </button>
        <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={onClose}>
          {t.common.close}
        </button>
      </div>
    </div>
  );
}
