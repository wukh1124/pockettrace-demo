// nuxt.config.ts
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",

  modules: ['@vite-pwa/nuxt'],

  pwa: {
    manifest: {
      name: 'PocketTrace',
      short_name: 'PocketTrace',
      theme_color: '#ffffff',
      background_color: '#ffffff',
      icons: [
        {
          src: '/favicon.svg',
          sizes: 'any',             // 宣告這個 SVG 可以適應任何尺寸
          type: 'image/svg+xml'
        },
        {
          src: '/icon-192x192.png', // PWA Android 核心要求
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/icon-512x512.png', // PWA Android 核心要求
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    }
  },

  app: {
    head: {
      title: 'PocketTrace', 
      meta: [
        // 🚀 關鍵設定：這行決定了 iOS「加至主畫面」時的預設名稱
        { name: 'apple-mobile-web-app-title', content: 'PocketTrace' },
        // 其他 iOS PWA 相關優化
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'mobile-web-app-capable', content: 'yes' }
      ],
      link: [
        // 優先使用 SVG (現代瀏覽器)
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/icon-192x192.png' }
      ]
    }
  },

  devServer: {
    host: '0.0.0.0', // 允許所有本地網路連線
  },
  devtools: { enabled: true },

  // 接管 Tailwind V4
  vite: {
    plugins: [
      tailwindcss() as any,
    ],
  },
  
  // 導入全域 CSS
  css: ['~/assets/css/main.css'],

   // 開放 Server 端與 Better Auth 會用到的環境變數
   runtimeConfig: {
     tursoDatabaseUrl: process.env.TURSO_DATABASE_URL,
     tursoAuthToken: process.env.TURSO_AUTH_TOKEN,
     betterAuthSecret: process.env.BETTER_AUTH_SECRET,
     mobileTestUrl: process.env.MOBILE_TEST_URL,
     //gcpProjectId: process.env.GCP_PROJECT_ID,
     //gcpLocation: process.env.GCP_LOCATION || 'us-central1',
     //vertexModel: process.env.VERTEX_MODEL || 'gemini-2.5-flash-lite',
     // AI Provider 設定
     aiProvider: process.env.NUXT_AI_PROVIDER || 'demo',
     aiNvidiaBaseUrl: process.env.NUXT_AI_NVIDIA_BASE_URL,
     aiNvidiaApiKey: process.env.NUXT_AI_NVIDIA_API_KEY,
     aiNvidiaModel: process.env.NUXT_AI_NVIDIA_MODEL,
     aiOpenrouterBaseUrl: process.env.NUXT_AI_OPENROUTER_BASE_URL,
     aiOpenrouterApiKey: process.env.NUXT_AI_OPENROUTER_API_KEY,
     aiOpenrouterModel: process.env.NUXT_AI_OPENROUTER_MODEL,
     // Demo 模式設定
     isDemoMode: process.env.IS_DEMO_MODE === 'true',
     demoUserEmail: process.env.DEMO_USER_EMAIL || 'demo@example.com',
     demoUserPassword: process.env.DEMO_USER_PASSWORD || 'demo123456',
     public: {
       baseUrl: process.env.BASE_URL || 'http://localhost:3000',
       // 公開 Demo 模式狀態供前端使用
       isDemoMode: process.env.IS_DEMO_MODE === 'true'
     }
   },

  // (選填) 您可以根據原先架構定義常用的 alias
  alias: {
    '@': './'
  },

  // 確保 md-editor-v3 在 SSR 時正確轉譯
  build: {
    transpile: ['md-editor-v3']
  }
});
