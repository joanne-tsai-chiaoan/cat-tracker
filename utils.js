// utils.js — pure helper functions, no side effects

export const uid = () => Math.random().toString(36).slice(2, 10);

export const today = () => new Date().toISOString().slice(0, 10);

export const fmtDate = (dateStr, locale = "zh-TW") => {
  const dt = new Date(dateStr + "T00:00:00");
  return dt.toLocaleDateString(locale, { month: "short", day: "numeric", weekday: "short" });
};

export const fmtTime = (iso, lang = "zh-TW") =>
  new Date(iso).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });

export const fmtWeekday = (dateStr, lang = "zh-TW") =>
  new Date(dateStr + "T00:00:00").toLocaleDateString(lang, { weekday: "short" });

export const last7Days = () =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

// Read file as base64 data URL
export const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// Calc water from wet food items (ml ≈ g for water)
export const calcWaterFromFood = (items, foodsMap) =>
  items.reduce((sum, item) => {
    const food = foodsMap[item.foodId];
    if (!food || food.type === "dry") return sum;
    const waterPct = food.waterPer100g ?? 0;
    return sum + (item.grams * waterPct) / 100;
  }, 0);

// Derive per-item nutrition from the food DB + stored grams.
// Falls back to whatever is stored on the item if the food has been deleted.
export const enrichItem = (item, foodsMap) => {
  const food = foodsMap[item.foodId];
  if (!food) return item;
  return {
    ...item,
    foodName:     food.name,
    foodType:     food.type,
    foodSubtype:  food.subtype,
    kcal:         (food.kcalPer100g           * item.grams) / 100,
    protein:      (food.proteinPer100g        * item.grams) / 100,
    waterFromFood:((food.waterPer100g ?? 0)   * item.grams) / 100,
  };
};

// Enrich a full meal log — compute totals from food DB so they're always current.
export const enrichLog = (log, foodsMap) => {
  if (log.kind !== "meal" || !log.items) return log;
  const items              = log.items.map(item => enrichItem(item, foodsMap));
  const totalKcal          = items.reduce((s, i) => s + (i.kcal          || 0), 0);
  const totalProtein       = items.reduce((s, i) => s + (i.protein       || 0), 0);
  const totalWaterFromFood = items.reduce((s, i) => s + (i.waterFromFood || 0), 0);
  const totalWater         = totalWaterFromFood + (log.extraWaterMl || 0);
  return { ...log, items, totalKcal, totalProtein, totalWater, totalWaterFromFood };
};
