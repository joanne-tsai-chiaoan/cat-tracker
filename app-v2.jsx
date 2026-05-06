import { useState, useEffect, useRef } from "react";

// ── i18n ──────────────────────────────────────────────────────────────────────
const LANGS = {
  zh: {
    appName: "毛孩日誌", appSub: "Cat Health Tracker",
    nav: { log: "今日", history: "歷史", stats: "統計", food: "糧食庫" },
    log: {
      title: "今天的紀錄", sub: "Today's Log",
      addMeal: "新增一餐", addWater: "喝水", addWaste: "排泄",
      mealType: "餐別",
      mealTypes: { breakfast: "早餐", lunch: "午餐", dinner: "晚餐", snack: "點心", other: "其他" },
      addFood: "加入糧食", selectFood: "選擇糧食",
      grams: "克數 (g)", gramsPlaceholder: "輸入克數",
      extraWater: "額外加水 (ml)", extraWaterPlaceholder: "0",
      cal: "熱量", protein: "蛋白質", water: "水分",
      totalCal: "總熱量", totalProtein: "總蛋白質", totalWater: "總水分",
      note: "備註", notePlaceholder: "這頓吃得好嗎？",
      photos: "照片", addPhoto: "新增照片",
      save: "儲存", noFood: "請先到糧食庫新增糧食",
      todayKcal: "今日熱量", todayWater: "今日水分",
      noLog: "今天還沒有紀錄", noLogSub: "點擊 + 開始紀錄",
      kcal: "大卡", g: "g", ml: "ml",
      waterIntake: "純水攝取", waterSource: "來源",
      waterSources: { bowl: "水碗", fountain: "飲水機", syringe: "針筒餵水", other: "其他" },
      fromFood: "來自濕糧",
      waste: { title: "排泄紀錄", poop: "便便", pee