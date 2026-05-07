export default defineNuxtRouteMiddleware(async (to, from) => {
    // 判斷是否為公開路由（登入/註冊/分享頁面）
    const isAuthRoute = to.path === '/login' || to.path === '/register'
    const isPublicRoute = isAuthRoute || to.path.startsWith('/share/') || to.path.startsWith('/n/')

    // ====== 檢查是否為 Demo 模式 ======
    const config = useRuntimeConfig()
    const isDemoMode = config.public.isDemoMode === true

    // Demo 模式：直接視為已登入，禁止訪問登入/註冊頁
    if (isDemoMode) {
      if (isAuthRoute) {
        return navigateTo('/')
      }
      // Demo 模式不檢查 cookie 或 session，直接放行
      return
    }

    // ====== Server 端：透過 cookie 做初步判斷 ======
    if (import.meta.server) {
      // Better Auth 預設 cookie 名稱為 'better-auth.session_token'，但 https 時會有 '__Secure-' 前綴
      const sessionCookie = useCookie('better-auth.session_token')
      const secureSessionCookie = useCookie('__Secure-better-auth.session_token')
      const hasSession = !!sessionCookie.value || !!secureSessionCookie.value

      if (hasSession) {
        // 有 session cookie，已登入 → 不允許訪問登入頁
        if (isAuthRoute) {
          return navigateTo('/')
        }
      } else {
        // 無 session cookie，未登入 → 非公開頁面重導到登入頁
        if (!isPublicRoute) {
          return navigateTo('/login')
        }
      }
      return
    }

    // ====== Client 端：使用 Better Auth useSession 精準判斷 ======
    const { useSession } = await import('~/utils/auth-client')
    const session = useSession()

    // 等待 session 載入完畢（最多等 3 秒）
    if (session.value?.isPending) {
      await new Promise<void>((resolve) => {
        const maxWait = setTimeout(resolve, 3000)
        const check = setInterval(() => {
          if (!session.value?.isPending) {
            clearInterval(check)
            clearTimeout(maxWait)
            resolve()
          }
        }, 50)
      })
    }

    const isLoggedIn = !!session.value?.data?.user

    if (isLoggedIn) {
      // 已登入時，不允許再訪問登入/註冊頁
      if (isAuthRoute) {
        return navigateTo('/')
      }
    } else {
      // 未登入時，非公開頁面重定向到登入頁
      if (!isPublicRoute) {
        return navigateTo('/login')
      }
    }
  })
