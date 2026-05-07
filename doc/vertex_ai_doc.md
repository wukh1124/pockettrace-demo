# Vertex AI 系統整合文檔

本文檔記錄了 PocketTrace 專案中 Vertex AI 的配置參數、護欄機制（Guards）、歷史上下文壓縮策略以及相關的資料庫設計。方便開發人員後續檢視與維護。

---

## 1. 系統架構與配置 (`configs/vertex.config.ts`)

### 1-1. 模型分類與定價 (Models)

定義於 `modelsInfo`，包含所有可用的 Vertex AI 模型及其定價（以每百萬 Tokens 計價，單位：USD）：

- **Pro 系列** (例如 `gemini-3.1-pro`, `gemini-2.5-pro`): 提供最高品質與長文/複雜推理。預設多數關閉以控管成本。
- **Flash 系列** (例如 `gemini-3-flash`, `gemini-2.5-flash`): 速度與品質平衡，為系統預設主力模型。
- **Lite 系列** (例如 `gemini-2.5-flash-lite`): 極致省錢，作為備援或是背景摘要處理首選。

### 1-2. 業務場景對應 (Model Usage)

根據 `modelUsage`，定義不同功能模組允許使用的模型列表。前端 (`pages/chat.vue`) 將動態讀取此列表，提供使用者可切換的聊天模型選項：

- **Chat**: 支援多種 Flash 與 Lite 模型。
- **Summarize / Analyze**: 限定使用最便宜的 `gemini-2.5-flash-lite` 執行背景總結與分析任務。
- **Search / Agent**: `gemini-3-flash` (具備速度與指令遵循優勢)。

---

## 2. 安全護欄與成本守衛 (Model Guard)

定義於 `modelGuard`，用以設定嚴格的防線，限制未預期的高昂花費及超大 Token 請求：

### 2-1. 預算限制 (Budget Control)

每次請求 API 時皆會查詢當前花費加總 (`aiTokenUsage`)：

- **全站每日總預算 (`totalDailyBudget`: 50.0 USD)**: 一旦當日所有用戶總計花費超過此金額，系統將阻擋所有新的 AI 生成請求。
- **單一用戶每月上限 (`userMonthlyLimit`: 5.0 USD)**: 超過此金額的個別用戶將無法呼叫 AI，防止惡意消耗。

### 2-2. Token 長度限制 (Token Limits)

- **輸入上限 (`defaultMaxInputTokens`: 2048)**: API 發送請求前，會預先調用 SDK 計算 Tokens，若超標則退回錯誤，避免產生巨額 Input 費用。
- **輸出上限 (`defaultMaxOutputTokens`: 2048)**: 直接作為呼叫模型時的上限配置，防止模型無限生成長文廢話。

---

## 3. 聊天歷史訊息壓縮策略 (History Compression)

對話記錄過長會導致後續每次 API 呼叫的 Context Window 急遽膨脹，進而浪費 Token 轉換為金錢。系統採用的 `historyCompression` 策略如下：

- **觸發條件 (`triggerThreshold`)**: 當歷史對話堆疊超過 **20 條**時自動觸發。
- **封存處理 (`archiveCount`)**: 提取最舊的前 **15 條** 訊息作為壓縮樣本。
- **背景摘要模型 (`model`)**: 強制指定使用最省錢的 `gemini-2.5-flash-lite` 模型來執行摘要。
- **長度限制 (`summaryMaxLength`)**: 將提取出的聊天內容濃縮為 **100 字** 以內的重點。
- **存放機制**: 系統會刪除原本的那 15 條原文對話，將這份摘要作為一筆 `role: 'system'` 的前情提要訊息取代塞回歷史紀錄的最前端。
- **最終保險機制 (`forceTruncateAfter`)**: 當意外情況導致單次歷史傳遞量達 **50 條** 以上時，不經過摘要，直接強制刪除最舊的訊息以策安全。

---

## 4. 資料庫綱要 (Database Schema)

檔案位置：`server/db/schema.ts`

為了實作精準的成本控制與儀表板統整（如 `/stats` 頁面顯示），我們在資料庫設計了相應的表結構。

### 4-1. 核心對話資料表

**`chatSessions` (對話階段)**
儲存使用者的會話狀態。

- `id` (text): Session 唯一識別碼
- `userId` (text): 關聯使用者 ID
- `title` (text): 對話標題
- `model` (text): 此 Session 目前所選用的 AI 模型

**`chatMessages` (對話內容)**
每一則對話皆獨立存儲，在壓縮策略觸發時會被刪減。

- `id` (text): 訊息 ID
- `sessionId` (text): 關聯 `chatSessions.id`
- `role` (text): 訊息角色 (`user`, `ai`, `system`)
- `content` (text): 詳細內文
- `model` (text): 生成時使用的模型 (若為 AI 生成)

### 4-2. Token 與花費精算表 (`aiTokenUsage`)

此表是用於預算把關 (`totalCost`) 與前端統計的核心骨幹。每一次成功呼叫 Vertex API 後，都會立刻結算寫入。
| 欄位名稱 | 型別 | 說明 |
| :--- | :--- | :--- |
| `id` | text | 紀錄唯一識別碼 |
| `userId` | text | 呼叫 AI 的使用者 (`user.id`) |
| `sessionId` | text | 關聯的聊天階段 (可選 `null`) |
| `model` | text | 當次生成使用的 AI 模型 |
| `promptTokens` | integer | 總輸入 (Prompt Context) Tokens 量 |
| `completionTokens` | integer | 總輸出 (Generated) Tokens 量 |
| `totalTokens` | integer | 總 Tokens 數 |
| `inputCost` | real | **該次輸入的預估花費 (單位：USD)** |
| `outputCost` | real | **該次輸出的預估花費 (單位：USD)** |
| `createdAt` | integer | 發生時間 |

> **花費計算公式：**  
> `inputCost` = `(promptTokens / 1_000_000) * model.input_cost`  
> `outputCost` = `(completionTokens / 1_000_000) * model.output_cost`
