# PocketTrace 數據庫表結構文檔

本文件詳細說明了 PocketTrace 專案中使用的資料庫表結構及其用途。系統採用 SQLite 資料庫，並透過 Drizzle ORM 進行操作。

## 1. 認證系統 (Better Auth)

這些表由 Better Auth 管理，處理用戶註冊、登入及會話管理。

### 1.1 `user` (用戶表)

儲存用戶的基本資料。
| 欄位名 | 類型 | 說明 |
| :--- | :--- | :--- |
| `id` | text | 主鍵 (UUID/ULID) |
| `name` | text | 用戶名稱 |
| `email` | text | 電子郵件 (不重複) |
| `email_verified` | integer (boolean) | 電子郵件是否已驗證 |
| `image` | text | 用戶頭像 URL |
| `created_at` | integer (timestamp) | 帳號建立時間 |
| `updated_at` | integer (timestamp) | 最後更新時間 |

### 1.2 `session` (會話表)

管理用戶登入狀態。
| 欄位名 | 類型 | 說明 |
| :--- | :--- | :--- |
| `id` | text | 主鍵 |
| `expires_at` | integer (timestamp) | 會話過期時間 |
| `token` | text | 會話令牌 |
| `ip_address` | text | 用戶 IP 地址 |
| `user_agent` | text | 瀏覽器代理資訊 |
| `user_id` | text | 關聯到 `user.id` |

### 1.3 `account` (帳號連接表)

儲存第三方登入 (OAuth) 或密碼資訊。
| 欄位名 | 類型 | 說明 |
| :--- | :--- | :--- |
| `id` | text | 主鍵 |
| `account_id` | text | 外部帳號 ID |
| `provider_id` | text | 供應商 ID (如 google, github, credential) |
| `user_id` | text | 關聯到 `user.id` |
| `password` | text | 加密後的密碼 (若使用密碼登入) |

### 1.4 `verification` (驗證表)

用於驗證碼、忘記密碼等流程。

---

## 2. 業務核心功能 (PocketTrace Core)

### 2.1 `trips` (行程表)

管理用戶的旅遊行程計畫。
| 欄位名 | 類型 | 說明 |
| :--- | :--- | :--- |
| `id` | text | 主鍵 |
| `user_id` | text | 擁有者 ID (外鍵) |
| `name` | text | 行程名稱 |
| `destination` | text | 目的地 |
| `start_date` | integer (ms) | 開始日期 |
| `end_date` | integer (ms) | 結束日期 |
| `status` | text | 狀態: `planning`, `confirmed`, `completed` |
| `cover_image` | text | 封面圖 URL |
| `itinerary` | text (json) | 詳細行程安排 (JSON 字串) |
| `flights` | text (json) | 航班資訊 (JSON 字串) |
| `is_public` | integer (boolean) | 是否公開 |
| `share_token` | text | 分享令牌 |

### 2.2 `notes` (筆記表)

記錄旅遊心得或瑣碎資訊。
| 欄位名 | 類型 | 說明 |
| :--- | :--- | :--- |
| `id` | text | 主鍵 |
| `owner_id` | text | 擁有者 ID (外鍵) |
| `title` | text | 標題 |
| `content` | text | 內容 |
| `tags` | text (json) | 標籤列表 (JSON 字串) |
| `is_pinned` | integer (boolean) | 是否置頂 |
| `is_public` | integer (boolean) | 是否公開發佈 |
| `share_token` | text | 專屬分享連結令牌 |

---

## 3. AI 聊天與統計 (AI Chat & Stats)

### 3.1 `chat_sessions` (對話階段表)

記錄每一場 AI 對話的標題與使用的模型。
| 欄位名 | 類型 | 說明 |
| :--- | :--- | :--- |
| `id` | text | 主鍵 |
| `user_id` | text | 關聯用戶 |
| `title` | text | 對話標題 |
| `model` | text | 所選 AI 模型 |

### 3.2 `chat_messages` (對話訊息表)

儲存對話中的每一條訊息。
| 欄位名 | 類型 | 說明 |
| :--- | :--- | :--- |
| `id` | text | 主鍵 |
| `session_id` | text | 關聯對話 ID |
| `role` | text | 角色: `user`, `ai`, `system` |
| `content` | text | 訊息內容 |
| `model` | text | 該條訊息生成時使用的模型 |

### 3.3 `ai_token_usage` (Token 使用統計表)

精確記錄 AI 資源消耗與成本。
| 欄位名 | 類型 | 說明 |
| :--- | :--- | :--- |
| `id` | text | 主鍵 |
| `user_id` | text | 使用者 ID |
| `session_id` | text | 相關對話 ID |
| `model` | text | 模型名稱 |
| `prompt_tokens` | integer | 輸入 Token 數 |
| `completion_tokens` | integer | 輸出 Token 數 |
| `total_tokens` | integer | 總 Token 數 |
| `input_cost` | real | 輸入成本 (USD) |
| `output_cost` | real | 輸出成本 (USD) |

---

## 4. 個人化設置 (Settings)

### 4.1 `user_settings` (用戶設置表)

| 欄位名             | 類型 | 說明                                   |
| :----------------- | :--- | :------------------------------------- |
| `user_id`          | text | 主鍵 (關聯 User)                       |
| `ai_provider`      | text | 預設 AI 供應商 (如 vertex, openrouter) |
| `openrouter_model` | text | OpenRouter 預選模型                    |
| `chat_tone`        | text | 聊天語氣風格                           |
