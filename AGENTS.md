## 專案定位

Nuxt 3 全端 (BFF) 應用「PocketTrace」— 個人數位指揮中心 (PWA)。
技術棧：**Nuxt 3 + Vue 3 + Tailwind CSS v4 + Drizzle ORM + Turso SQLite + Better Auth + @vite-pwa/nuxt**。

---

## 開發指令

| 指令 | 用途 |
|------|------|
| `npm run dev` | 啟動開發服務（預設 `:3000`，已設 `host: '0.0.0.0'` 供內網手機測試） |
| `npm run db:push` | 將 `server/db/schema.ts` 變更同步到本地 SQLite（開發首選） |
| `npm run db:studio` | 啟動 Drizzle Studio GUI 管理資料庫 |
| `npm run build` | 編譯生產版本，啟動：`node .output/server/index.mjs` |
| `npm run preview` | 預覽生產構建 |
| `caddy run --config Caddyfile` | （選用）本地代理至 `http://pockettrace.local` |

---

## 資料庫與 Schema

- **Schema 定義檔**：`server/db/schema.ts`（含 Better Auth 桌表與業務桌表）。
- **ORM**：Drizzle ORM + `@libsql/client`。
- **關聯**：手動定義 Drizzle `relations()` 在 schema.ts 內。
- **本地開發**：使用 SQLite 檔案 `file:./local.db`（透過 `TURSO_DATABASE_URL`）。
- **修改後必做**：`npm run db:push`（README 主推 push；migrations 目錄已存在但非流程重點）。

---

## 認證與路由守衛

- **Auth 框架**：Better Auth（email/password），cookie 名稱為 `better-auth.session_token`。
- **全局中介層**：`middleware/auth.global.ts`
  - 公開路由（無需登入）：`/login`、`/register`、`/share/*`、`/n/*`
  - Server 端以 cookie 初步檢查；Client 端以 `useSession()` 精準判斷，最多等 3 秒。
- **Server API 認證**：`server/utils/session.ts` 提供 `getServerSession(event)` 與 `requireAuth(event)`。
- **Auth Client**：`utils/auth-client.ts` 以 `createAuthClient` 建立，自動判斷 baseURL。

---

## 樣式與 UI 約束

### Tailwind CSS v4 特殊配置
- **非 PostCSS 路徑**：使用 `@tailwindcss/vite` 插件於 `nuxt.config.ts` 的 `vite.plugins`。
- **CSS 入口**：`assets/css/main.css` 以 `@import "tailwindcss"` 導入。
- **Dark Mode**：class-based（`@custom-variant dark (&:where(.dark, .dark *))`）。
- **md-editor-v3 相容性**：必須於 `nuxt.config.ts` 設 `build.transpile: ['md-editor-v3']`；`main.css` 內含多條修復（SVG display、button background、list-style、table border 等）。

### iOS / PWA 全局 CSS 限制
- `html, body` 設為 `position: fixed`、`overflow: hidden`、`overscroll-behavior-y: none`（禁止橡皮筋）。
- 實際滾動區域為 `#__nuxt`（`overflow-y: scroll`、`-webkit-overflow-scrolling: touch`）。
- 元件內嚴禁使用固定 `px` 寬度；需考慮 `env(safe-area-inset-bottom)`。

### 響應式與觸控規範
- **Mobile-First**（< 640px）；斷點 Tablet 640-1024px、Desktop > 1024px。
- **禁止 hover-only 關鍵操作**：手機版（< 768px）操作按鈕必須直接顯示或收進「更多」選單。
- **觸控目標**：最小 44x44 px，間距至少 8px。
- **表單輸入**：font-size 須 ≥ 16px（避免 iOS 自動縮放），適當使用 `inputmode`（如 `numeric`）。
- **導航**：桌面側邊欄在手機自動轉為底部導航或 Drawer。
- **Modal/Drawer 開啟時**：必須鎖定背景滾動（`overflow: hidden`）。

---

## AI 功能與 Vertex AI

- **模型庫**：`configs/vertex.config.ts` 定義可用模型（Gemini / Imagen）與價格、使用場景對照 (`modelUsage`)。
- **預設模型**：環境變數 `VERTEX_MODEL` 預設為 `gemini-2.5-flash-lite`。
- **必要環境變數**：`GCP_PROJECT_ID`、`GCP_LOCATION`（預設 `us-central1`）。
- **Trip AI**：自然語言生成行程與航班；image 生成功能使用 Imagen。
- **費用守衛**：`modelGuard` 控制每日總預算與用戶每月限制，歷史訊息壓縮以 `summarize` 策略觸發。

---

## 目錄與架構

```
server/api/          # API 路由（Nitro），以檔案路徑自動映射
server/db/           # Drizzle schema、連線初始化、 migrations
server/utils/        # 後端工具：auth.ts、session.ts
composables/         # 前端共用邏輯（useAuth、useNotes、useTrips...）
utils/               # 前端工具：auth-client.ts、markdown.ts
layouts/             # default.vue、auth.vue、share.vue
pages/               # 前端路由
```

- **share layout**：用於公開筆記閱讀頁（`/n/[id].vue` 與 `/share/*`）。
- **auth layout**：用於登入/註冊頁。
- **alias**：`@` 指向專案根目錄（`./`）。

---

## 環境變數重點（參考 `.env.example`）

```
TURSO_DATABASE_URL=file:./local.db
TURSO_AUTH_TOKEN=
BETTER_AUTH_SECRET=       # 至少 32 字元
BETTER_AUTH_URL=http://localhost:3000
BASE_URL=http://localhost:3000
```

選填：`GCP_PROJECT_ID`、`GCP_LOCATION`、`VERTEX_MODEL`、`LOCAL_TEST_URL`。

---

## 常見開發陷阱

1. **修改 schema.ts 後忘記 `db:push`** → API 會因欄位不存在報錯。
2. **新增第三方 Vue 套件出現 SSR 水合錯誤** → 嘗試加入 `build.transpile`。
3. **Tailwind v4 與套件樣式衝突** → 檢查 `main.css` 是否已有對應修復（尤其 md-editor-v3）。
4. **暗色模式失效** → 確認 `html` 元素有 `class="dark"`，而非依賴 `prefers-color-scheme`。
5. **手機端 hover 殘留** → 使用 `:active` 提供觸覺反饋；所有關鍵功能不可僅依賴 hover。
