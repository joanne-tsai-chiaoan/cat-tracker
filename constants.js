// constants.js — visual config, no logic

export const TYPE_COLORS = {
  dry:        { bg: "#f5e8d0", fg: "#7a5010", bar: "#d4a060" },
  wet:        { bg: "#d0e8f5", fg: "#10507a", bar: "#60a0d4" },
  treat:      { bg: "#eed0f5", fg: "#6a108b", bar: "#c060d4" },
  supplement: { bg: "#d0f5e8", fg: "#108b50", bar: "#60d4a0" },
};

export const POOP_COLORS = {
  brown:  "#8B5E3C",
  dark:   "#2d1a0e",
  yellow: "#c8a93a",
  red:    "#c04040",
  gray:   "#909090",
  other:  "#aaa",
};

export const POOP_CONSISTENCY_COLORS = {
  normal:  "#6ac499",
  soft:    "#c4c46a",
  mushy:   "#c4956a",
  liquid:  "#c46a6a",
  hard:    "#8b8b6a",
};

export const PEE_COLORS = {
  normal:  "#f5e8a0",
  dark:    "#c8a020",
  orange:  "#e07030",
  red:     "#c04040",
  clear:   "#d0eef5",
};

export const CHART_PALETTE = ["#c4956a", "#6aabca", "#c46ab4", "#6ac499", "#cac46a", "#6a6aca"];

export const WATER_SOURCE_ICONS = {
  bowl: "🥣", fountain: "⛲", syringe: "💉", other: "💧",
};

// Default sample foods pre-loaded on first launch
export const SAMPLE_FOODS = [
  {
    name: "希爾思雞肉主食罐", brand: "Hill's",
    type: "wet", subtype: "pate",
    kcalPer100g: 85, proteinPer100g: 10.2, waterPer100g: 75,
  },
  {
    name: "皇家成貓乾糧", brand: "Royal Canin",
    type: "dry", subtype: "kibble",
    kcalPer100g: 376, proteinPer100g: 32, waterPer100g: 10,
  },
];
