# 從零到 Production：毛孩日誌 PWA × Google Drive 整合

> **Staff Engineer 視角的技術回顧**  
> 時間：2026-05  
> 範疇：React PWA、GitHub Pages、GoDaddy DNS、Google Drive API、OAuth 2.0、Vitest、Playwright、GitHub Actions

---

## TL;DR（Business Impact）

一個**零後端成本、跨裝置、資料自主**的個人 PWA。透過 Google Drive 作為每個使用者的私有資料庫，把原本只能本地存的健康追蹤 app 變成可跨手機、平板、電腦同步的產品——不需要 server、不需要資料庫、不需要付任何基礎設施費用。

整個開發過程也是一次完整的 **quality engineering 實驗**：從「寫完就 push」到「測試守門 + CI 擋住壞部署」，中間走過的彎路本身就是這份文件最有價值的部分。

---

## 一、Context：為什麼要做這個

**問題陳述**：貓咪的飲食、排泄、體重紀錄散落在各種 app、備忘錄或根本沒記錄，無法追蹤趨勢、無法跨裝置使用。

**約束條件**：
- 個人工具，不值得付 AWS/Vercel 費用
- 需要在手機上快速開、快速記
- 資料要是自己的（不想存在陌生公司的 server）
- 多貓主人可以各自用

這些約束條件直接驅動了所有後續的架構決策。

---

## 二、最終架構

```
使用者裝置
  ├── PWA (React + Vite)
  │     ├── localStorage   ← 主要讀取來源（offline-first）
  │     └── in-memory      ← 照片 blob URL cache（session-only）
  │
Google Drive (appDataFolder)
  ├── cat-tracker.json     ← 文字資料（logs, foods, profile）
  └── photo_*.jpg          ← 照片獨立檔案

部署
  GitHub Repo → GitHub Actions → GitHub Pages → cat.joannetca.com
  GoDaddy DNS: CNAME cat → joanne-tsai-chiaoan.github.io
```

**資料流**：
1. App 啟動 → 從 localStorage 同步讀取（0ms，即使離線）
2. 若已登入 → background pull from Drive → 更新 React state
3. 每次資料變動 → localStorage 即時更新 + 3秒 debounce → push to Drive
4. 加照片 → 先存 data URL 顯示 → background upload to Drive → 替換成 file ID

**CI/CD 管線**：
```
push to main
  ↓
unit-test (Vitest) ──→ 失敗就停，不進入後續
  ↓
e2e-test (Playwright) ──→ 失敗就停，不部署
  ↓
build (vite build)
  ↓
deploy (GitHub Pages)
```

---

## 三、關鍵架構決策與取捨

### 決策 1：GitHub Pages + 自訂域名，不用 Vercel/Netlify

| | GitHub Pages | Vercel |
|--|--|--|
| 費用 | 免費 | 免費（有限制）|
| SSR | 不支援 | 支援 |
| 自動 HTTPS | ✅ | ✅ |
| 操作複雜度 | 低 | 極低 |

**選擇 GitHub Pages 的原因**：這是純靜態 SPA，不需要 SSR，不需要 Edge Functions，Pages 完全夠用。Vercel 的優勢對這個 use case 沒有意義。

> **Staff 思維**：選工具要 match 需求，而不是選「最強的工具」。過度工程是有成本的——setup cost、mental model、vendor lock-in。

---

### 決策 2：Google Drive `appDataFolder` scope，不建自己的 backend

**選項比較**：

| 方案 | 好處 | 壞處 |
|--|--|--|
| 自建 API + DB | 完全控制 | 月費 $10–50、安全性責任、維護成本 |
| Firebase | 快速、便宜 | 資料在 Google，有存量限制，vendor lock-in |
| **Drive appDataFolder** | 資料屬於使用者、免費、零後端 | API 較複雜，需要 OAuth |

**`appDataFolder` 的關鍵屬性**：
- 每個使用者的資料存在自己的 Google Drive 隱藏資料夾
- 其他 app 看不到，使用者可以刪除
- 容量算在使用者的 Drive quota（15GB free）
- 不需要你的 server 做任何事

**Strategic impact**：這個選擇讓 scaling 從 O(你的 server) 變成 O(Google 的 infrastructure)。一萬個使用者跟一個使用者的成本對你來說一樣是零。

> **Staff 思維**：把 storage 問題「外包」給一個已經解決了這個問題的公司（Google），讓自己專注在產品邏輯。這叫做 **leverage existing infrastructure**。

---

### 決策 3：照片存獨立檔案，不 base64-in-JSON

這是被 push back 後修正的重要決策。

**最初的實作**（錯誤）：
```js
// 把照片 base64 編碼存進 data.json
{ logs: [...], photos: ["data:image/jpeg;base64,/9j/4AAQ..."] }
```

**問題分析**：
```
一張手機照片 ≈ 500KB
base64 膨脹 33% → 667KB
1個月每天一張 × 30天 = 20MB
data.json 每次 open app 都要完整下載
6個月後 = 120MB JSON → timeout、記憶體爆炸
```

**正確做法**：
```
appDataFolder/
  cat-tracker.json    ← 只有文字，幾年都不超過 1MB
  photo_1234.jpg      ← 個別照片，按需載入
```

```js
// log entry 只存 reference
{ photoIds: ["drive:1BxiMVs0XxX..."] }

// 顯示時才 fetch，並 cache blob URL
async function getPhotoUrl(ref) {
  if (_cache[ref]) return _cache[ref];  // memory cache
  const url = await fetchPhotoBlob(ref);
  _cache[ref] = url;
  return url;
}
```

> **Staff 思維**：設計時要想「這個資料結構在一年後會長多大？」。把不同存取頻率的資料分開存（metadata 每次都要、photo 只有看的時候才要），是資料建模的基本原則。類比：資料庫裡不會把大 blob 存在 row 裡，會用 S3 key。

---

### 決策 4：localStorage 作為 primary，Drive 作為 sync layer

**Offline-first 設計**：

```
App 啟動
  ↓
讀 localStorage（同步，0ms）← 使用者立刻看到資料
  ↓
background: pull from Drive
  ↓
若有更新 → set state → re-render
```

**為什麼不直接 await Drive？**：
1. Drive API call 需要 100–500ms
2. 網路不好時可能秒等甚至失敗
3. 使用者體驗差——每次開 app 都要等

**這個模式的 trade-off**：
- 如果有多裝置同時編輯，可能 conflict（last write wins）
- 對個人日誌 app 來說這個 trade-off 完全可以接受

> **Staff 思維**：「夠好」是一個合法的工程決策。不是所有系統都需要 CRDT 或 OT。了解你的 use case 的 consistency requirements，然後選最簡單能滿足需求的方案。

---

### 決策 5：測試策略分三層，各司其職

加入測試基礎建設時，要在「測試覆蓋率」、「執行速度」、「維護成本」之間取捨。

| 層次 | 工具 | 測什麼 | 速度 |
|--|--|--|--|
| Unit | Vitest | `mergeLogs` 邏輯、localStorage I/O | < 1秒 |
| Component | Vitest + RTL | React component 能否 render、互動是否正確 | < 5秒 |
| E2E | Playwright | 整個 app 在真實瀏覽器裡是否空白 | ~1分鐘 |

**E2E 的核心價值**：這一層抓到了 unit test 和 component test 都抓不到的問題——build 產物在真實瀏覽器的行為。`height: 100dvh` 造成的空白頁、missing import 造成的 runtime crash、component 沒有 render 出 `.section-title`，都是 E2E 才看得到的。

> **Staff 思維**：測試的價值不在「有幾個測試」，在「它能抓到哪些真實問題」。E2E test 的存在讓 CI 在 deploy 之前就發現了空白頁——而不是讓使用者在手機上發現。

---

## 四、踩過的坑（最有學習價值的部分）

### Bug 1：雙 React 實例，app 全白（沉默失敗）

**現象**：app 開起來，有背景色，但什麼 UI 都沒有。

**根本原因**：

```html
<!-- index.html 原本的寫法 -->
<script type="module">
  import { createElement } from 'https://esm.sh/react@18';  ← CDN React
  import App from './App.jsx';                               ← Vite 打包的 React
  createRoot(document.getElementById('root')).render(createElement(App));
</script>
```

Vite 打包 `App.jsx` 時，`import { useState } from "react"` 從 node_modules 解析。但 `createElement` 從 `esm.sh` CDN 來。**兩個不同的 React 實例**。

React hooks 的規則：hooks 必須在同一個 React context 裡跑。兩個 React 實例 → hooks 失效 → component 渲染空白，**沒有 error message**。

**修法**：
```jsx
// main.jsx — 讓 Vite 完全接管 entry point
import { createRoot } from "react-dom/client";
import "./styles/main.css";
import App from "./App.jsx";
createRoot(document.getElementById("root")).render(<App />);
```

**教訓**：
1. 永遠讓 bundler 負責 dependency resolution，不要混用 CDN import
2. 「沉默失敗」比 crash 更危險——它通過了 build、通過了 deploy，但功能完全壞掉
3. E2E test 可以在 CI 抓到這類問題，但前提是 CI 要存在且要在 deploy 前跑

---

### Bug 2：首次登入，資料不上傳到 Drive

**現象**：使用者第一次登入，已有的 localStorage 資料沒有同步到 Drive。

**根本原因**：

```js
onTokenChange(async (token) => {
  const data = await syncFromDrive(); // 第一次 → 回傳 null
  if (data) {
    setLang(data.lang);  // data 是 null，跳過
  }
  setSyncStatus("ok");  // ← 什麼都沒上傳，但狀態標 ok
});

// debounced push 只在 state 變動時觸發
useEffect(() => {
  if (!isSignedIn()) return;
  // push...
}, [lang, profile, foods, logs]); // pull 回 null → state 沒變 → 不觸發
```

**問題**：state machine 少了一個分支。

**修法**：
```js
const data = await syncFromDrive();
if (data) {
  // case 1：有 Drive 資料 → pull
} else {
  // case 2：首次 → push
  await syncToDrive(stateRef.current);
}
```

**教訓**：sync 邏輯的 bug 幾乎都是 edge state 沒處理。要把 state machine 完整列出來：有資料、沒資料（首次）、不可達（離線）。只實作 happy path 是初稿，不是完成品。

---

### Bug 3：`useEffect` 沒 import，History tab 全白（沉默失敗，再次）

**現象**：點 History tab，頁面全白，沒有 error message。

**根本原因**：

```js
// LogHistoryPages.jsx
import { useState } from "react";  // ← useEffect 沒有 import

export function LogCard({ log, t, onDelete }) {
  useEffect(() => { ... }, [confirm]);  // ← runtime: ReferenceError
  // React 捕捉到 error → 整個 component tree 卸載 → 空白頁
}
```

**為什麼 build 成功**：Vite/esbuild 不做 type check 也不分析 runtime binding，只要語法合法就過。`useEffect` 在 js 層面看起來就是一個「還沒宣告」的變數，build 不會抓。

**修法**：`import { useState, useEffect } from "react";`

**這個 bug 教會我們更重要的事**：**component render test 可以在 30 秒內抓到這個問題**。事後加的 component 測試就包含了這個 case——渲染 `LogCard`、點 delete button、驗證 confirm 狀態。如果一開始有這個測試，這個 bug 永遠不會進 production。

> **Staff 思維**：不是所有 bug 都需要更聰明的 code 來防範，有些只需要一個覆蓋到 render 流程的測試。

---

### Bug 4：`height: 100dvh` 讓 iOS Safari 空白頁

**現象**：iOS Safari 上，cat.joannetca.com 開啟後只有背景色，沒有任何 UI。

**時間線**：
1. 因為 iOS 安全區域和 bounce scroll 的問題，加入了 layout 優化
2. 把 `body` 和 `#root` 從 `min-height: 100dvh` 改成 `height: 100dvh`
3. 同時讓 `.page` 負責自己的 scroll（`overflow-y: auto; flex: 1; min-height: 0`）
4. 結果：iOS Safari 的空白頁更嚴重

**根本原因**：

`height: 100dvh` 是硬上限。iOS Safari 的動態工具列（address bar 展開/收起）會讓 `dvh` 的計算值在不同狀態下不同。當 flex 子元素的高度計算出現毫差，`.page` 就可能得到 0 height，整個內容消失——**沒有 error，沒有 scroll，只有背景色**。

`min-height: 100dvh` 是安全下限——內容超出就自然往下延伸，不會被截斷。

```css
/* ❌ 危險 */
body { height: 100dvh; }       /* 硬上限，iOS 計算偏差就截斷 */
#root { height: 100dvh; }

/* ✅ 安全 */
body { min-height: 100dvh; }   /* 至少這麼高，內容多就延伸 */
#root { min-height: 100dvh; }
```

**這個 bug 更深層的問題**：修改 CSS layout 時，沒有做跨平台的視覺驗證。Vitest / component test 不跑 CSS，Playwright 預設跑 Chromium desktop，而 iOS Safari 的 `dvh` 行為跟 Chrome 不同。

**為什麼這麼難發現**：
- 本地 dev server 在 Chrome 上正常
- CI 的 Playwright 用 Chromium，也正常
- 只有 iOS Safari 會爆

> **Staff 思維**：「在我的機器上正常」在 cross-platform 問題上毫無意義。iOS Safari 對 viewport unit 的處理歷來有 quirk，凡是 `100vh` / `100dvh` 的硬性高度設定，都要在真機上驗證。

---

### Bug 5：`StatsPage` 空資料時不渲染標題

**現象**：E2E test 顯示 Stats tab 找不到 `.section-title`。

**根本原因**：

```jsx
// StatsPage — 當 logs 為空，直接 return empty-state，跳過 section-title
if (!logs.length) return (
  <div className="empty-state">...</div>  // ← 沒有 section-title
);
```

這意味著：
1. **使用者體驗不一致**——其他 tab 空白時都有 title，Stats 沒有
2. **E2E 測試誤報**——測試在找 `.section-title` 來確認頁面非空白，但 Stats 在空資料時合法沒有它

**修法**：所有 tab 一律先渲染 section-title，empty state 顯示在 title 之下：

```jsx
return (
  <div>
    <div className="section-title">...</div>
    {!logs.length
      ? <div className="empty-state">...</div>
      : <>...實際內容...</>
    }
  </div>
);
```

**教訓**：空白狀態是一個真實的 UI state，不是邊界案例。每個頁面都應該有一致的結構，讓使用者（和測試）能預期。

---

### Bug 6：CI 環境與本地不一致，lockfile 損壞

**現象**：CI 的 `npm ci` 持續失敗，報 `Missing: esbuild@0.28.0 from lock file`。

**時間線與因果鏈**：

```
本地環境: Node 23 (odd-release, non-LTS)
安裝 vitest@4 (要求 node ^20 || ^22 || >=24)
                ↓
Node 23 不在支援範圍，但 npm 只 warn，不擋
npm install 在 Node 23 下生成 lockfile
lockfile 沒有包含 vitest@4 + vite@6+ 所需的 esbuild@0.28
                ↓
CI 設定 Node 23 (跟本地一樣)
npm ci 的 esbuild 解析邏輯不同 → lockfile 對不上
                ↓
把 CI 改成 Node 20 LTS
vitest@4 明確不支援 Node 23，要求 ^20 || ^22 || >=24
Node 20 解析 vitest@4 peer deps 方式不同 → 還是對不上
                ↓
根本解：降 vitest 到 v2
vitest@2 支援 vite@4-5，支援任何現代 Node，peer dep 衝突消失
lockfile 重新生成後穩定
```

**根本決策錯誤**：一開始選 vitest@4 是因為它是最新版，而沒有先確認它與現有 `vite@5` 的相容性。vitest 版本應該跟 vite 版本配對選：

| vite | vitest |
|--|--|
| v5 | v1 或 v2 |
| v6 | v3 或 v4 |

**更深層的教訓**：**CI 環境應該從專案開始就鎖定**，而不是後來才設。「先 ship、後加 CI」的順序製造了一個問題——當我加 CI 時，工具版本已經是本地開發用的組合，不一定是 CI 友善的組合。

> **Staff 思維**：CI 不只是「跑測試的地方」，它是**每個 commit 的品質驗證基礎**。它應該在第一個 commit 就存在，因為它和 code 本身一樣重要。

---

### Bug 7：Playwright strict mode 造成 E2E 誤報

**現象**：修好了 Stats 標題問題後，E2E 還是失敗，報 `strict mode violation: resolved to 2 elements`。

**根本原因**：

```js
// 同一頁面同時有 .section-title 和 .empty-state
// Playwright 的 toBeVisible() 預設是 strict mode
await expect(page.locator('.section-title, .empty-state')).toBeVisible();
// ↑ 找到 2 個元素 → strict mode 報錯
```

**修法**：

```js
await expect(page.locator('.section-title, .empty-state').first()).toBeVisible();
```

**教訓**：Playwright 的 locator 在「多個 match」時會 throw，除非明確處理。寫 E2E test 時要了解 strict mode 的預設行為，避免模糊的 locator。

---

## 五、測試基礎建設的決策與取捨

這個專案的測試是在功能完成後才加的，這本身就是一個教訓。以下是最終的選型決策。

### 為什麼選 Vitest 不選 Jest？

| | Vitest | Jest |
|--|--|--|
| 設定 | 跟 vite.config.js 共用 | 需要獨立設定 |
| ESM 支援 | 原生 | 需要額外設定 |
| 速度 | 較快（native ESM） | 較慢（CJS transform）|
| 生態系 | 與 Jest 相容 | 成熟 |

**選擇 Vitest**：這個 project 已經用 Vite，Vitest 是零設定的自然選擇。

### 為什麼 E2E 用 Playwright 不用 Cypress？

| | Playwright | Cypress |
|--|--|--|
| 多瀏覽器 | Chromium / Firefox / WebKit | Chromium only（free tier）|
| CI 支援 | 好 | 好 |
| iOS Safari 近似 | WebKit | 無 |
| 速度 | 較快 | 較慢 |

**選擇 Playwright**：WebKit engine 可以近似測試 iOS Safari 行為——這正是這個 project 的痛點所在。

### CI 跑 E2E 的成本

E2E 在 CI 上需要：
1. Build 一次（給 `vite preview` 用）
2. 安裝 Playwright browsers（~500MB，有 cache）
3. 跑測試（~1分鐘）

**決策**：E2E 擋住 deploy，但**不擋住 unit test 的反饋**。pipeline 是序列的（unit → e2e → build → deploy），讓開發者可以先得到快速的 unit test 結果。

---

## 六、可遷移的 Strategic Patterns

### Pattern 1：Zero-backend Architecture for Personal Tools

```
user → static hosting (GitHub Pages)
         ↓ OAuth
     Google Drive (per-user storage)
```

適用場景：個人工具、小團隊內部工具、prototype。當你不需要跨使用者的資料（aggregation、ranking、社交功能），這個架構可以讓你在維護成本幾乎為零的情況下 ship 產品。

**不適用場景**：需要 server-side aggregation、需要推播通知、需要即時多人協作。

---

### Pattern 2：Offline-first with Background Sync

```
Read path:  localStorage → instant
Write path: localStorage → debounced remote sync
```

核心原則：**local state is the source of truth for the UI，remote is the source of truth for persistence**。

---

### Pattern 3：Separate Concerns in Storage

| 資料類型 | 特性 | 存法 |
|--|--|--|
| 結構化文字 | 頻繁讀、小 | 單一 JSON |
| 大型 binary | 按需讀、大 | 獨立檔案 + key reference |
| 暫時 cache | Session only | Memory |
| 離線 fallback | Instant read | localStorage |

這個模式直接 map 到傳統後端：PostgreSQL（結構）+ S3（binary）+ Redis（cache）。

---

### Pattern 4：測試金字塔與 CI 守門

```
         /\
        /E2E\        少量、慢、抓整合問題
       /------\
      /Component\    中量、快、抓 render crash
     /------------\
    /  Unit Tests  \ 多量、極快、抓邏輯問題
   /________________\
```

**CI 守門的價值不是「測試數量」，是「部署前有沒有自動確認基本功能正常」**。這個 project 加了 CI 之後，每一個 bug fix 都有對應的測試防止 regression。

---

### Pattern 5：Debug-first Instrumentation

這個 project 在 Debug 階段加了完整的 `[auth]`、`[drive]`、`[app]` prefix logging。這讓我們在 5 分鐘內就確認了 Drive sync 是否正常。

好的 log 設計：
```js
console.log("[drive] writeDriveData start — logs:", data.logs?.length);
console.log("[drive] writeDriveData OK");
// 或
console.error("[drive] writeDriveData failed", res.status, await res.text());
```

- 有 prefix → 可以 filter
- 有 input summary → 知道在處理什麼
- 有 success/failure 兩條路 → 知道走了哪條

---

## 七、如果重來，我會改什麼

1. **CI 第一個 commit 就設好**，並且先確認工具版本組合（vite + vitest）的相容性，再開始功能開發。「先 ship 後加 CI」的順序讓 CI 一直在追 code，而不是保護 code。

2. **從一開始就用 Vite entry point**，不用 esm.sh dev trick——它只適合沒有 bundler 的純瀏覽器開發。

3. **先畫 state machine，再寫 sync logic**——sync code 的 bug 幾乎都是 edge state 沒處理。

4. **CSS layout 改動一定要在真機 iOS Safari 上驗證**，尤其是 `100dvh`、`position: sticky`、flex height 的組合。這類問題 Playwright Chromium 抓不到，只有 WebKit 或真機才會出現。

5. **`min-height` 幾乎永遠比 `height` 安全**，用於 viewport 高度時尤其如此。除非你非常確定需要硬性截斷，否則不要用 `height: 100dvh`。

6. **Component test 要覆蓋到 import**——最小可用的 component render test 就能抓到 `useEffect` 沒 import 這類問題，而且它在 2 秒內跑完。

7. **E2E test 要在真實 build 上跑（`vite preview`），不要只跑 dev server**——`vite build` 的行為跟 `vite dev` 不同，manifest 路徑、asset hash、dead code elimination 都在 build 時才發生。

8. **Pending queue for offline photo upload**——目前照片在離線時 fallback 到 data URL，沒有在重新上線後自動補傳。這是下一個要補的功能。

---

## 八、成本分析

| 項目 | 方案 | 月費 |
|--|--|--|
| Hosting | GitHub Pages | $0 |
| Domain | GoDaddy joannetca.com | ~$1/月 |
| Storage | Google Drive (per user) | $0（15GB free） |
| Auth | Google Identity Services | $0 |
| CI/CD | GitHub Actions | $0（public repo） |
| Backend | 無 | $0 |
| **總計** | | **~$1/月** |

如果用傳統方案（Vercel + Supabase + own auth）：
- Supabase: $25/月（Pro plan）
- 加 S3 for photos: ~$5/月
- 加 CDN: ~$5/月
- **總計：~$35/月**

零後端架構在這個 use case 省了 97% 的基礎設施成本，同時把資料控制權還給使用者。

---

## 九、延伸閱讀

- [Google Drive API — appDataFolder](https://developers.google.com/drive/api/guides/appdata)
- [Google Identity Services — Token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model)
- [Vite — Static Asset Handling](https://vitejs.dev/guide/assets.html)
- [Offline-first web applications (Jake Archibald)](https://jakearchibald.com/2014/offline-cookbook/)
- [PWA Manifest best practices](https://web.dev/add-manifest/)
- [Playwright — Strict mode](https://playwright.dev/docs/locators#strictness)
- [iOS Safari viewport units quirks (web.dev)](https://web.dev/viewport-units/)
