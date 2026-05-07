# Demo 模式功能說明與 Task List

## 背景說明

為了方便推廣與展示 PocketTrace 的功能和 UI 效果，系統支援 **Demo 模式**。在此模式下，使用者無需註冊或登入即可直接體驗 App 的核心功能。

## 運作機制

1. **觸發方式**：透過 `runtimeConfig.isDemoMode` 控制（對應環境變數 `IS_DEMO_MODE=true`）。
2. **身份模擬**：
   - 後端 `requireAuth` 與 `getServerSession` 會自動回傳一個預設的 `Demo User` (demo@example.com) session。
   - 若資料庫中不存在該使用者，系統會自動在啟動或首次請求時建立。
3. **資料持久化**：
   - Demo 模式下的操作（如建立筆記、管理行程）**會真實寫入資料庫**。
   - 這確保了體驗的連貫性，使用者重新整理頁面後，剛才建立的資料依然存在。

## 已實作功能 (Demo Mode)

- [x] **自動身份認證**：全局攔截器自動處理 Demo 身分，免登入進入主介面。
- [x] **UI 橫幅提示**：在側邊欄與行動端選單顯示「Demo 模式」字樣，提醒使用者資料僅供展示。
- [x] **筆記管理**：支援完整的建立、編輯、刪除、置頂功能。
- [x] **行程展示**：
  - 手動建立行程：支援正常操作。
  - **AI 行程生成**：攔截 AI 請求，回傳預設的模擬行程資料（避免產生 Vertex AI 費用）。
- [x] **AI 統計數據**：在聊天頁面回傳預設的統計數據（`usage.get.ts`）。
- [x] **安全限制**：
  - 禁止修改密碼。
  - 禁止登出（或在登出時給予警告/攔截）。

## 限制事項與 AI 行為

在 Demo 模式下，為了節省 API 成本與確保穩定性，以下功能會受限：

| 功能模組        | 一般模式行為        | Demo 模式行為                              |
| :-------------- | :------------------ | :----------------------------------------- |
| **登入/註冊**   | 正常驗證            | 自動登入為 Demo User                       |
| **AI 行程規劃** | 呼叫 Vertex AI 生成 | 回傳固定 Mock 資料 (東京 5 天 4 夜)        |
| **AI 筆記摘要** | 呼叫 LLM 處理       | 目前尚未特別攔截 (需評估是否需改為 Mock)   |
| **聊天機器人**  | 與 Gemini 對話      | 目前維持原樣 (若需節省額度可考慮改為 Mock) |
| **設定頁面**    | 修改個人資料/密碼   | 鎖定密碼修改功能                           |

## 開發者注意事項 (Task List)

- [x] **AI 服務 Mock 完整化 (全端覆蓋)**：
  - [x] **聊天會話標題 (`api/chat/sessions/summarize`)**：實作 Demo 攔截，避免 API 調用。
  - [ ] **行程封面生成 (`api/trips/generate-cover`)**：將目前的 Todo 改為正式的 Demo 攔截，提供高品質 Mock 圖片。
  - [ ] **筆記摘要功能 (預留 API)**：實作 `api/notes/[id]/summarize` 的 Demo 版本。
  - [ ] **Token 統計模擬**：在 Demo 模式下模擬產生 Token 用量記錄，讓統計頁面有數據可看。
  - [ ] **統一 Mock 內容管理**：在 `server/utils/ai-provider.ts` 建立 `getDemoResponse` 函式。

- [ ] **資料定期清理**：由於 Demo 資料會寫入 DB，建議在 Server 啟動時或透過 Cron Job 定期重設 Demo User 的資料。
- [ ] **多語系支援**：確認 Demo 模式的橫幅提示是否支援 i18n。
- [ ] **PWA 離線測試**：驗證 Demo 模式在 PWA 離線環境下的表現。

---

## 相關代碼位置

- **後端邏輯**：`server/utils/session.ts`
- **UI 提示**：`layouts/default.vue`
- **Mock 範例**：`server/api/trips/generate.post.ts`
- **Auth 組合函數**：`composables/useAuth.ts`
