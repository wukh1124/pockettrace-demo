# PocketTrace 專案 AI 協作指南 (GEMINI.md)

## 1. 專案技術棧 (Tech Stack)
- **前端框架**：Nuxt 3 (Vue 3, Composition API, `<script setup>`)
- **後端 API**：Nuxt Server Routes (`server/api/`)
- **資料庫 ORM**：Drizzle ORM (`server/db/schema.ts`)
- **語言**：TypeScript (嚴格型別檢查)
- **資料庫**：SQLite (基於 db 資料夾與 migration 判斷，如有更換請更新)

## 2. 開發規範與風格
- **元件開發**：
  - 優先使用 `composables/` 來抽離共用邏輯。
  - UI 元件放置於 `components/`，遵循現有命名規範。
- **後端開發**：
  - API 路由請嚴格遵守 Nuxt Nitro 的檔案命名慣例（如 `[id].get.ts`, `index.post.ts`）。
  - 資料庫操作請透過 Drizzle ORM，並維持型別安全。
- **型別定義**：
  - 共用型別可放置於 `types/` 目錄中（如 `Note.ts`, `Trips.ts`）。

## 3. 測試與部署
- 請確保改動不破壞原有的 SSR (Server-Side Rendering) 機制。
- 若有新增環境變數，請同步更新 `.env.example`。

## 4. 全局規則繼承
- 本專案繼承全局的 **Antigravity Agent Rules**（位於 `~/.gemini/gemini.md`）。
- 回覆、思考與註解預設使用**繁體中文 (zh-TW)**。
- 若無明確要求，請保持最小化改動 (Minimal Diffs)，避免過度工程。
