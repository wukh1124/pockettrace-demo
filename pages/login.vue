<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Eye, EyeOff, Lock, Mail, Radar } from 'lucide-vue-next'
import { authClient } from '../utils/auth-client'
import { useDemo } from '../composables/useDemo'

definePageMeta({ layout: 'auth' })

const route = useRoute()
const { isDemoMode } = useDemo()

// Demo 模式：自動跳轉到首頁
onMounted(() => {
  if (isDemoMode.value) {
    navigateTo('/')
  }
})

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

const handleSubmit = async () => {
  errorMessage.value = ''

  if (!email.value || !password.value) {
    errorMessage.value = '請輸入 Email 與密碼。'
    return
  }

  isSubmitting.value = true
  const { error } = await authClient.signIn.email({
      email: email.value,
      password: password.value,
  })
  isSubmitting.value = false

  if (error) {
      errorMessage.value = '登入失敗，請確認帳號密碼或稍後再試。'
      console.error(error)
  } else {
      const redirectTo = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
      // 使用 external: true 強制頁面刷新，確保 session 狀態被正確載入
      await navigateTo(redirectTo, { external: true })
  }
}
</script>

<template>
  <div class="rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-200/40 dark:shadow-black/20">
    <div class="px-8 pb-8 pt-10 text-center">
      <div class="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
        <Radar :size="22" />
      </div>
      <h1 class="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">PocketTrace</h1>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">登入後繼續管理你的指揮中心</p>
    </div>

    <form class="space-y-5 px-8 pb-10" @submit.prevent="handleSubmit">
      <div class="space-y-2">
        <label class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Email</label>
        <div class="relative">
          <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
            <Mail :size="18" />
          </span>
          <input
            v-model="email"
            type="email"
            placeholder="name@company.com"
            class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-3 pl-10 pr-4 text-sm text-slate-800 dark:text-slate-200 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800"
          />
        </div>
      </div>

      <div class="space-y-2">
        <label class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Password</label>
        <div class="relative">
          <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
            <Lock :size="18" />
          </span>
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="••••••••"
            class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-3 pl-10 pr-12 text-sm text-slate-800 dark:text-slate-200 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800"
          />
          <button
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300"
            @click="showPassword = !showPassword"
            aria-label="Toggle password visibility"
          >
            <Eye v-if="showPassword" :size="18" />
            <EyeOff v-else :size="18" />
          </button>
        </div>
      </div>

      <div v-if="errorMessage" class="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
        {{ errorMessage }}
      </div>

      <button
        type="submit"
        class="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
        :disabled="isSubmitting"
      >
        <span>{{ isSubmitting ? '登入中...' : 'Sign In' }}</span>
      </button>

      <div class="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 text-xs text-slate-500 dark:text-slate-400">
        <RouterLink class="font-medium hover:text-slate-800 dark:hover:text-slate-200" to="/register">建立新帳號</RouterLink>
        <button class="font-medium text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300" type="button">忘記密碼</button>
      </div>
    </form>
  </div>

  <p class="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">© 2026 PocketTrace</p>
</template>
