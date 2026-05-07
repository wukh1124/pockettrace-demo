# AI 功能 - 從 Vertex AI 轉移到 OpenAI 兼容 API（已完成）

## 📋 遷移概述

PocketTrace 已於 2026-04-30 完成從 **Vertex AI (Google GenAI SDK)** 到 **OpenAI 兼容 API** 的遷移工作。

### 變更前後對比

| 項目 | 變更前（Vertex AI） | 變更後（OpenAI 兼容） |
|------|-------------------|---------------------|
| **聊天對話** | `GoogleGenAI` SDK + Vertex AI | OpenAI 兼容 `/v1/chat/completions` + SSE 串流 |
| **行程生成** | `GoogleGenAI` SDK + `responseMimeType` | OpenAI 兼容 API + `response_format: { type: 'json_object' }` |
| **對話摘要** | `GoogleGenAI` SDK | OpenAI 兼容 API（非串流） |
| **封面生成** | Gemini + Imagen 4 兩階段 | 暫時停用，回傳測試假圖片 |
| **配置方式** | `configs/vertex.config.ts` | 依 Provider 拆分（`nvidia.config.ts` / `openrouter.config.ts`） |
| **Provider 切換** | 不支援 | 透過 `NUXT_AI_PROVIDER` 環境變數動態切換 |
| **依賴套件** | `@google/genai` | 移除，改用原生 `fetch` |

---

## 1. 當前架構

### 1-1. 支援的 Provider

| Provider | BASE_URL | 特點 | 預設模型 |
|----------|----------|------|----------|
| **NVIDIA NIM** | `https://integrate.api.nvidia.com/v1` | 高效能推理、自帶 API Key | `minimaxai/minimax-m2.7` |
| **OpenRouter** | `https://openrouter.ai/api/v1` | 多模型聚合、需設定 App Attribution | `minimax/minimax-m2.5:free` |

### 1-2. 環境變數配置（`.env`）

```env
# 切換用 (支援 nvidia | openrouter)
NUXT_AI_PROVIDER=nvidia

# 通用設定
NUXT_AI_TIMEOUT=30000
NUXT_AI_DEFAULT_TEMPERATURE=0.7

# NVIDIA NIM
NUXT_AI_NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NUXT_AI_NVIDIA_API_KEY=nvapi-your-api-key
NUXT_AI_NVIDIA_MODEL=minimaxai/minimax-m2.7

# OpenRouter
NUXT_AI_OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
NUXT_AI_OPENROUTER_API_KEY=sk-or-your-api-key
NUXT_AI_OPENROUTER_MODEL=minimax/minimax-m2.5:free

# 公開資訊 (用於 OpenRouter App Attribution)
NUXT_PUBLIC_SITE_URL=http://localhost:3000
NUXT_PUBLIC_SITE_NAME=Nuxt_AI_Core
```

### 1-3. 配置檔結構

```
configs/
├── nvidia.config.ts      # NVIDIA NIM 配置（含模型資訊、價格）
├── openrouter.config.ts  # OpenRouter 配置（含模型資訊、價格）
server/
├── utils/
│   └── ai-provider.ts  # 統一 Provider 工具（含 SSE 解析、錯誤處理）
```

---

## 2. 已完成變更

### 2-1. 新增配置檔

#### `configs/nvidia.config.ts`
- 定義 NVIDIA NIM Provider 配置
- 模型資訊：`minimaxai/minimax-m2.7`（input: $0.30, output: $1.20 / 1M tokens）
- 保留 `modelGuard` 設定（預算控制、歷史壓縮策略）

#### `configs/openrouter.config.ts`
- 定義 OpenRouter Provider 配置
- 模型資訊：
  - `minimax/minimax-m2.5:free`（免費版，input: $0, output: $0）
  - `minimax/minimax-m2.5`（付費版，input: $0.118, output: $1.35 / 1M tokens）
- 包含 OpenRouter 特殊 headers 設定（`HTTP-Referer`, `X-OpenRouter-App`）

### 2-2. 新增共用工具

#### `server/utils/ai-provider.ts`
提供以下功能：
- **動態 Provider 載入**：根據 `NUXT_AI_PROVIDER` 載入對應配置
- **模型選擇**：`getModelForUsage(usageType)` 根據用途（chat/summarize/trip）回傳模型
- **SSE 串流解析**：解析 OpenAI 兼容格式的 `data: {...}\n\n` 串流
- **API 呼叫封裝**：`callOpenAICompatibleAPI()` 統一處理請求、headers、錯誤處理
- **成本計算**：`calculateTokenCost()` 根據 `usage` 計算 input/output 成本
- **錯誤處理**：API 連線失敗時回傳「服務未開放，請稍後再試」友善訊息

### 2-3. API 重寫

#### `server/api/chat/messages/index.post.ts`（聊天串流）
- 移除 `GoogleGenAI` SDK，改用 `fetch` 呼叫 OpenAI 兼容 API
- 實作 SSE 串流解析（`data: {...}` 格式）
- 處理 `choices[0].delta.content` 擷取文字
- 偵測 `finish_reason: "stop"` 或 `data: [DONE]` 結束串流
- 保留 Token 用量計算（若有 `usage` 欄位）
- 錯誤處理：API 連線失敗時回傳「服務未開放，請稍後再試」

#### `server/api/trips/generate.post.ts`（行程生成）
- 改用 OpenAI 兼容 API 的 `/v1/chat/completions`
- 使用 `response_format: { type: 'json_object' }` 強制 JSON 輸出
- 移除 Vertex AI 專用的 `responseMimeType` 參數
- 錯誤處理：API 失敗回傳友善錯誤訊息

#### `server/api/chat/sessions/summarize.post.ts`（對話摘要）
- 改用 OpenAI 兼容 API（非串流請求）
- 用於生成對話標題（不超過 10 字繁體中文）

#### `server/api/trips/generate-cover.post.ts`（封面生成）
- **暫時停用真實圖片生成**
- Step 1（提示詞生成）：暫時用假提示詞（不呼叫 API）
- Step 2（圖片生成）：回傳測試用假圖片 URL（`/uploads/test-cover.jpg`）
- 在回應中標註「測試圖片，正式圖片生成功能開發中」
- 保留 API 結構，方便之後接回真實圖片 API（如 OpenAI DALL-E、Stable Diffusion）

### 2-4. 清理工作

- ✅ 刪除 `configs/vertex.config.ts`
- ✅ 刪除 `server/utils/test-imagen.ts`
- ✅ 移除 `package.json` 中的 `@google/genai` 依賴
- ✅ 更新 `app.config.ts`：移除 vertex 引用，改用動態 Provider

---

## 3. 當前限制與後續工作

### 3-1. 已知限制

| 限制項目 | 說明 | 影響程度 |
|---------|------|---------|
| **圖片生成停用** | 封面生成暫時回傳假圖片 | 中（功能缺失） |
| **SSE 格式相容性** | 不同 Provider 的 SSE 格式可能略有差異 | 中（需實際測試） |
| **JSON 模式支援** | 部分 Provider 可能不支援 `response_format` | 中（需後備解析邏輯） |
| **Token 用量計算** | 若 Provider 不回傳 `usage`，成本記錄會是 0 | 低（僅影響統計） |
| **多模態支援** | NVIDIA NIM 部分模型支援圖片，但需確認 | 中（聊天可能受限） |

### 3-2. 後續工作清單

- [ ] **測試 API 連線**：先用 curl 或 Postman 測試 NVIDIA/OpenRouter API 是否通
- [ ] **補上假圖片**：在 `public/uploads/` 放一張 `test-cover.jpg` 避免 404
- [ ] **接回圖片生成 API**：可考慮 OpenAI DALL-E 3、Stable Diffusion API
- [ ] **完善錯誤處理**：針對不同 Provider 的錯誤格式做專屬處理
- [ ] **前端模型選擇**：若需顯示新模型列表，更新前端 UI
- [ ] **成本監控**：確認 `aiTokenUsage` 表有正確記錄（若 Provider 有回傳 usage）
- [ ] **更新舊文檔**：將 `doc/vertex_ai_doc.md` 標記為已過時或刪除

---

## 4. 技術細節參考

### 4-1. OpenAI 兼容 API 串流格式

```typescript
// Request
POST /v1/chat/completions
{
  "model": "minimaxai/minimax-m2.7",
  "messages": [...],
  "stream": true,
  "max_tokens": 8192
}

// Response SSE format
data: {"id":"...","object":"chat.completion.chunk","choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}
data: {"id":"...","object":"chat.completion.chunk","choices":[{"delta":{"content":" World"},"finish_reason":null}]}
data: {"id":"...","object":"chat.completion.chunk","choices":[{"delta":{},"finish_reason":"stop"}]}
data: [DONE]
```

### 4-2. 錯誤處理範例

```typescript
try {
  const response = await fetch(`${baseUrl}/chat/completions`, { ... });
  if (!response.ok) {
    return { content: '服務未開放，請稍後再試 (API 連線失敗)' };
  }
  // ... 處理串流
} catch (err) {
  return { content: '服務暫時不可用，請聯絡管理員' };
}
```

### 4-3. 模型價格參考（來源：OpenRouter / NVIDIA 官網）

| 模型 | Provider | Input (USD/1M) | Output (USD/1M) | Context Window |
|------|----------|-----------------|-----------------|---------------|
| `minimaxai/minimax-m2.7` | NVIDIA NIM | $0.30 | $1.20 | 204,800 |
| `minimax/minimax-m2.5:free` | OpenRouter | $0 | $0 | 196,608 |
| `minimax/minimax-m2.5` | OpenRouter | $0.118 | $1.35 | 196,608 |

---

## 5. Git Commit 記錄

建議的 Commit Message：
```
refactor(ai): migrate from Vertex AI to OpenAI compatible API

- Add nvidia.config.ts and openrouter.config.ts for provider-specific settings
- Create server/utils/ai-provider.ts as unified provider utility
- Rewrite chat/trips API to use OpenAI compatible /v1/chat/completions
- Replace streaming logic with SSE parsing for OpenAI format
- Temporarily disable image generation with placeholder responses
- Remove @google/genai dependency and vertex.config.ts
- Update app.config.ts to support dynamic provider switching
```

---

## 6. 參考資料

- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [NVIDIA NIM API Docs](https://build.nvidia.com/docs)
- [OpenRouter API Docs](https://openrouter.ai/docs)
- [SSE Streaming 格式說明](https://platform.openai.com/docs/api-reference/streaming)

---

_最後更新：2026-04-30 | 遷移狀態：✅ 已完成_
