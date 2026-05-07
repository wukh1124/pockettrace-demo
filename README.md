# PocketTrace (Personal Command Center)

![Nuxt](https://img.shields.io/badge/Nuxt-3-00DC82?style=flat&logo=nuxt.js)
![Vue](https://img.shields.io/badge/Vue-3-4FC08D?style=flat&logo=vue.js)
![Turso](https://img.shields.io/badge/Turso-SQLite-4FB3E9?style=flat&logo=sqlite)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

**PocketTrace** 是一個自託管、手機優先 (Mobile-First) 的 **個人數位指揮中心 (Personal Command Center)**。

旨在解決資訊分散的問題，將 **旅程規劃**、**訂閱管理**、**Markdown 隨筆** 與 **常用應用入口** 整合於單一介面。透過 PWA 技術，提供類原生 App 的流暢體驗，同時保有數據的完全掌控權。

## 📌 進度更新 (Progress)

- [x] **Notes 系統**：列表、標籤、搜尋、釘選、Markdown 編輯器
- [x] **認證系統**：基於 Better Auth 的 Email/Password 登入與註冊流程
- [x] **分享功能**：公開閱讀頁支援 Markdown 渲染與程式碼高亮
- [x] **架構重構**：全面遷移至 Nuxt 3 (BFF 架構) + Drizzle ORM + Turso SQLite
- [x] **PWA 優化**：iOS / Android 行動裝置適配、深色模式支援
- [x] **圖片上傳**：筆記內嵌圖片上傳功能

## ✨ 核心功能 (Features)

### 📱 手機優先設計 (Mobile-First UI)

- 類原生 App 的底部導航欄與平滑的 Bottom Sheet 操作。
- 桌面端自動切換為側邊導航軌 (Side Rail) 與便當盒 (Bento Box) 儀表板佈局。
- 支援 PWA 安裝，iOS 與 Android 裝置適配完善。

### ✈️ 旅程管理 (Trip Management)

- **視覺化行程表**：每日行程細分為 早/中/晚 時段。
- **航班追蹤**：登機證風格的航班資訊卡片。
- **狀態管理**：自動區分進行中、規劃中與回憶（歷史行程）。
- **AI 助理**：用戶可透過把自然文字輸入給AI，AI會自動分析並生成航班追蹤與行程表。AI模型使用vertex ai, 需根據vertex.config.ts設定modelUsage中的trip。

### 💳 訂閱追蹤 (Subscription Tracker)

- **到期警示**：自動計算並高亮顯示即將續費的服務。
- **花費分析**：支援多幣種記錄與月度/年度支出統計。

### 📝 隨筆與知識庫 (Markdown Notes)

- 內建 Markdown 編輯器（寫作/預覽），支援標籤分類與釘選。
- **公開分享**：支援短效 Token、分享連結與到期設定。
- **閱讀頁**：內建 Markdown 渲染與程式碼高亮。
- **圖片上傳**：編輯器內建圖片上傳功能。

### 🚀 應用啟動器 (App Launcher)

- 個人化的 Web App 書籤管理，快速跳轉常用服務。

## 🛠️ 技術棧 (Tech Stack)

本專案採用 **Nuxt 3** 作為全端 (BFF) 解決方案，利用 **Turso (SQLite)** 做為資料庫，部署更為輕量與彈性。

- **Framework:** [Nuxt 3](https://nuxt.com/) (全端 BFF 框架)
- **Database:** [Turso](https://turso.tech/) (邊緣 SQLite)
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication:** [Better Auth](https://better-auth.com/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **PWA:** [@vite-pwa/nuxt](https://vite-pwa-org.netlify.app/frameworks/nuxt)
- **Markdown:** [md-editor-v3](https://imzbf.github.io/md-editor-v3/)
- **Routing/Proxy:** [Caddy](https://caddyserver.com/) (本地開發網域代理)

## 📂 專案結構 (Project Structure)

```text
pockettrace/
├── assets/css/            # 全域 CSS (Tailwind 設定)
├── components/            # Vue 共用 UI 組件
├── composables/           # Nuxt 共用邏輯 (useAuth, useNotes...)
├── layouts/               # 頁面佈局 (default, auth, share)
├── middleware/            # 路由中介層 (認證守衛)
├── pages/                 # 前端路由頁面 (Notes, Trips, Settings...)
├── public/                # 靜態資源 (favicon, PWA icons)
├── server/                # Nuxt BFF 後端代碼
│   ├── api/               # API 路由 (auth, notes, upload)
│   ├── db/                # Drizzle ORM Schema 與 Migrations
│   └── utils/             # 後端工具 (DB 與 Auth 初始化)
├── types/                 # TypeScript 型別定義
├── utils/                 # 前端共用工具 (auth-client, markdown)
├── nuxt.config.ts         # Nuxt 設定檔
├── drizzle.config.ts      # Drizzle 設定檔
└── Caddyfile              # Caddy 本地代理配置
```

## 🚀 快速開始 (Getting Started)

### 前置要求

- **Node.js** 20+
- **Caddy** (選用，用於本地開發網域代理)

### 1. 克隆專案

```bash
git clone https://github.com/yourusername/pockettrace.git
cd pockettrace
```

### 2. 環境變數設定

複製 `.env.example` 為 `.env` 並修改設定：

```bash
cp .env.example .env
```

主要設定項目：

```env
TURSO_DATABASE_URL=file:./local.db
TURSO_AUTH_TOKEN=
BETTER_AUTH_SECRET=your-secret-key-at-least-32-characters-long
BETTER_AUTH_URL=http://localhost:3000
BASE_URL=http://localhost:3000
```

> ⚠️ `BETTER_AUTH_SECRET` 請使用至少 32 字元的隨機字串。

### 3. 安裝依賴庫與資料庫初始化

```bash
npm install

# 第一次運行時，同步 Drizzle Schema 結構到本地 SQLite
npm run db:push
```

### 4. 啟動全端服務 (Nuxt)

前端與 API 會同時透過 Nuxt 一起運作，預設運行於 `:3000`。

```bash
npm run dev
```

### 5. 啟動本地代理 (Caddy，選用)

為了模擬生產環境的網域結構與解決跨域 Cookie，請在專案根目錄開啟另一個終端機執行：

```bash
caddy run --config Caddyfile
```

### 🎉 訪問應用

- **App 首頁**: http://localhost:3000 (或 http://pockettrace.local 透過 Caddy)
- **Drizzle DB 後台**: `npm run db:studio` (啟動後可圖形化管理資料庫)

---

## 📦 資料庫與管理 (Database Tools)

使用 **Drizzle ORM** 來管理 SQLite。若你修改了 `server/db/schema.ts`：

```bash
# 讓修改直接套用到本地開發用的 DB
npm run db:push

# 開啟圖形化瀏覽與編輯器
npm run db:studio
```

## 🚢 生產環境部署 (Production Build)

PocketTrace 支援編譯成通用的 Node 服務，你可以透過 PM2 或 Docker 進行部署。

1. **編譯生產版本：**

   ```bash
   npm run build
   ```

2. **啟動：**

   ```bash
   node .output/server/index.mjs
   ```

   預設監聽 3000 port，若需更改請加上 `PORT` 環境變數。

## 🤝 貢獻 (Contributing)

歡迎提交 Issue 或 Pull Request！對於重大變更，請先開啟 Issue 討論您想要更改的內容。

## 📄 授權 (License)

本專案採用 [MIT License](LICENSE) 授權。
