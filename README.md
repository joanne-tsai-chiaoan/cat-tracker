# 毛孩日誌 · Cat Health Tracker

iPhone-first cat health tracking PWA.

## Features
- 🍽 Meal logging — multi-food per meal, auto-calc kcal / protein / water from food
- 💧 Water intake — pure drinking + water from wet food, separate logging
- 💩 Waste log — poop (color, consistency, photos) + pee (clumps, diameter, color)
- 📊 Stats — nutrition / water / waste tabs with charts
- 🌐 Bilingual — 繁體中文 / English toggle
- 📱 PWA — add to iPhone home screen for full-screen app experience

## Storage
All data currently stored in `localStorage` (browser-local).
To migrate to Google Drive: replace `storage.js` with a Google Drive API implementation
using the same exported function signatures. No other files need to change.

---

## Deploy to cat.joanne.wiki via GitHub Pages

### 1. Install & build
```bash
npm install
npm run build
# Output goes to /dist
```

### 2. Push to GitHub
```bash
git init
git add .
git commit -m "init"
gh repo create cat-health-tracker --public --push
```

### 3. Enable GitHub Pages
- Go to repo → Settings → Pages
- Source: `gh-pages` branch  (or use the `dist` folder directly)
- Or install `gh-pages` package and add to package.json scripts:
  ```json
  "deploy": "npm run build && gh-pages -d dist"
  ```
  Then: `npm run deploy`

### 4. Point GoDaddy DNS to GitHub Pages
In GoDaddy DNS settings, add a CNAME record:
```
Type:  CNAME
Name:  cat          (creates cat.joanne.wiki)
Value: YOUR-GITHUB-USERNAME.github.io
TTL:   1 hour
```

In GitHub repo Settings → Pages → Custom domain: enter `cat.joanne.wiki`
GitHub will auto-provision HTTPS via Let's Encrypt.

### 5. Add to iPhone Home Screen
Open `https://cat.joanne.wiki` in Safari →
Share button → "Add to Home Screen" → Done
The app opens full-screen, no browser UI.

---

## Local development
```bash
npm install
npm run dev
# Open http://localhost:5173
```

## File structure
```
cat-tracker/
├── App.jsx                          # Top-level state & routing
├── i18n.js                          # All UI strings (zh + en)
├── storage.js                       # ← ONLY file to change for Google Drive migration
├── utils.js                         # Pure helper functions
├── constants.js                     # Colors, type definitions, sample data
├── styles/main.css                  # All styles
├── components/
│   ├── ui/index.jsx                 # PhotoPicker, PieChart, WeeklyBarChart, Lightbox
│   ├── pages/
│   │   ├── LogHistoryPages.jsx      # LogPage, HistoryPage, LogCard
│   │   └── StatsAndFoodPages.jsx    # StatsPage, FoodDbPage
│   └── modals/
│       ├── AddMealModal.jsx
│       ├── WaterWasteModals.jsx     # AddWaterModal, AddWasteModal
│       └── FoodProfileModals.jsx    # AddFoodModal, ProfileModal
├── index.html
├── manifest.json                    # PWA manifest
├── vite.config.js
└── package.json
```
