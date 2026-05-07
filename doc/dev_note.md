# PocketTrace 開發備忘錄

## Nuxt 開發伺服器

```bash
# 啟動開發伺服器（前端 + API 同時運行於 :3000）
npm run dev

# 編譯生產版本
npm run build

# 預覽生產版本
npm run preview
```

## Caddy 本地代理

```bash
# 啟動 Caddy（模擬正式環境網域 pockettrace.local）
caddy run --config Caddyfile
```

> 需要先在本機 hosts 設定 `127.0.0.1 pockettrace.local`

## 資料庫 (Drizzle ORM + Turso)

```bash
# Schema 變更後，直接推送到本地開發 DB
npm run db:push

# 開啟圖形化資料庫管理介面
npm run db:studio

# 產生 Migration 檔案（若需要版本化管理）
npx drizzle-kit generate
```

## 環境變數

參考 `.env.example` 建立 `.env` 檔案。主要變數：

- `TURSO_DATABASE_URL` — 本地開發使用 `file:./local.db`
- `TURSO_AUTH_TOKEN` — 本地開發留空即可
- `BETTER_AUTH_SECRET` — 認證加密金鑰（至少 32 字元）
- `BETTER_AUTH_URL` — 認證服務網址
- `BASE_URL` — 應用基礎網址
- `LOCAL_TEST_URL` — （選填）內網測試用 URL

## 常用存取網址

| 用途           | 網址                            |
| -------------- | ------------------------------- |
| 開發伺服器     | http://localhost:3000           |
| Caddy 代理     | http://pockettrace.local        |
| Drizzle Studio | 執行 `npm run db:studio` 後開啟 |
