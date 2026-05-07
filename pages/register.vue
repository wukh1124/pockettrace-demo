<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Eye, EyeOff, Lock, Mail, User, Sparkles } from 'lucide-vue-next'
import { authClient } from '../utils/auth-client'
import { useDemo } from '../composables/useDemo'

definePageMeta({ layout: 'auth' })

const router = useRouter()
const { isDemoMode } = useDemo()

// Demo 模式：自動跳轉到首頁
onMounted(() => {
  if (isDemoMode.value) {
    navigateTo('/')
  }
})

const fullName = ref('')
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const showPassword = ref(false)
const agree = ref(true)
const isSubmitting = ref(false)
const errorMessage = ref('')

const handleSubmit = async () => {
  errorMessage.value = ''

  if (!email.value || !password.value) {
    errorMessage.value = '請完整填寫註冊資訊。'
    return
  }

  if (password.value !== passwordConfirm.value) {
    errorMessage.value = '密碼與確認密碼不一致。'
    return
  }

  if (!agree.value) {
    errorMessage.value = '請先同意使用條款與隱私政策。'
    return
  }

  isSubmitting.value = true
  
  const { error } = await authClient.signUp.email({
      email: email.value,
      password: password.value,
      name: fullName.value || 'User',
  })
  
  isSubmitting.value = false

  if (error) {
      errorMessage.value = '註冊失敗，請確認欄位格式或稍後再試。'
      console.error(error)
  } else {
      await navigateTo('/', { external: true })
  }
}
</script>

<template>
  <div class="rounded-2xl border border-slate-200/70 bg-white shadow-2xl shadow-slate-200/40">
    <div class="px-8 pb-8 pt-10 text-center">
      <div class="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
        <Sparkles :size="22" />
      </div>
      <h1 class="mt-4 text-2xl font-bold tracking-tight text-slate-900">建立 PocketTrace 帳號</h1>
      <p class="mt-2 text-sm text-slate-500">開始打造你的個人指揮中心</p>
    </div>

    <form class="space-y-5 px-8 pb-10" @submit.prevent="handleSubmit">
      <div class="space-y-2">
        <label class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Full Name</label>
        <div class="relative">
          <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <User :size="18" />
          </span>
          <input
            v-model="fullName"
            type="text"
            placeholder="John Doe"
            class="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-800 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </div>

      <div class="space-y-2">
        <label class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Email</label>
        <div class="relative">
          <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Mail :size="18" />
          </span>
          <input
            v-model="email"
            type="email"
            placeholder="name@company.com"
            class="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-800 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </div>

      <div class="space-y-2">
        <label class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Password</label>
        <div class="relative">
          <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Lock :size="18" />
          </span>
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="••••••••"
            class="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-12 text-sm text-slate-800 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <button
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
            @click="showPassword = !showPassword"
            aria-label="Toggle password visibility"
          >
            <Eye v-if="showPassword" :size="18" />
            <EyeOff v-else :size="18" />
          </button>
        </div>
      </div>

      <div class="space-y-2">
        <label class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Confirm Password</label>
        <div class="relative">
          <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Lock :size="18" />
          </span>
          <input
            v-model="passwordConfirm"
            :type="showPassword ? 'text' : 'password'"
            placeholder="••••••••"
            class="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-800 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </div>

      <label class="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
        <input v-model="agree" type="checkbox" class="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600" />
        <span>
          我同意
          <span class="font-semibold text-indigo-500">服務條款</span>
          與
          <span class="font-semibold text-indigo-500">隱私政策</span>
        </span>
      </label>

      <div v-if="errorMessage" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {{ errorMessage }}
      </div>

      <button
        type="submit"
        class="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-300/40 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
        :disabled="isSubmitting"
      >
        <span>{{ isSubmitting ? '建立中...' : 'Create Account' }}</span>
      </button>

      <div class="border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
        已經有帳號了？
        <RouterLink class="font-semibold text-indigo-500 hover:text-indigo-600" to="/login">登入</RouterLink>
      </div>
    </form>
  </div>

  <p class="mt-6 text-center text-xs text-slate-400">© 2026 PocketTrace</p>
</template>
