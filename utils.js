// utils.js — pure helper functions, no side effects

export const uid = () => Math.random().toString(36).slice(2, 10);

export const today = () => new Date().toISOString().slice(0, 10);

export const fmtDate = (dateStr, locale = "zh-TW") => {
  const dt = new Date(dateStr + "T00:00:00");
  return dt.toLocaleDateString(locale, { month: "short", day: "numeric", weekday: "short" });
};

export const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });

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
