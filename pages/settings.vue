<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { 
  User, 
  Lock, 
  LogOut, 
  Upload, 
  Check,
  AlertCircle,
  Palette,
  Sun,
  Moon,
  Info,
  ArrowLeft,
  ChevronRight,
  Type
} from 'lucide-vue-next'
import { useAuth } from '../composables/useAuth'
import { useUserSettings } from '../composables/useUserSettings'
import { useDemo } from '../composables/useDemo'

const router = useRouter()
const { user, logout, updateProfile, changePassword, getAvatarUrl } = useAuth()
const { fontSize } = useUserSettings()
const { isDemoMode } = useDemo()

const activeTab = ref('profile') // 'profile' | 'security' | 'appearance' | 'about'
const isLoading = ref(false)
const message = ref({ type: '', text: '' })

// Dark Mode
const isDark = ref(false)

const toggleDark = () => {
  isDark.value = !isDark.value
  const html = document.documentElement
  if (isDark.value) {
    html.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    html.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
  // 同步更新 iOS 狀態列 / 動態島的背景色
  const themeColor = isDark.value ? '#020617' : '#ffffff'
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', themeColor)
}

// Profile Form
const username = ref('')
const email = ref('')
const avatarFile = ref<File | null>(null)
const avatarPreview = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

// Password Form
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

// 分頁定義
const tabs = [
  { key: 'profile', label: '個人資料', icon: User },
  { key: 'security', label: '帳號安全', icon: Lock },
  { key: 'appearance', label: '外觀設定', icon: Palette },
  { key: 'about', label: '關於', icon: Info },
]

// 監聽使用者資料，確保載入後填入表單
watch(user, (newUser) => {
  if (newUser) {
    username.value = newUser.name || '' 
    email.value = newUser.email || ''
    avatarPreview.value = getAvatarUrl(newUser)
  }
}, { immediate: true })

// 初始化設定資料
onMounted(() => {
  // 檢查主題
  const savedTheme = localStorage.getItem('theme')
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  isDark.value = savedTheme === 'dark' || (!savedTheme && systemDark)
})

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    avatarFile.value = file
    avatarPreview.value = URL.createObjectURL(file)
  }
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleUpdateProfile = async () => {
  isLoading.value = true
  message.value = { type: '', text: '' }
  
  try {
    const formData = new FormData()
    formData.append('username', username.value)
    formData.append('name', username.value) 
    
    if (avatarFile.value) {
      formData.append('avatar', avatarFile.value)
    }

    await updateProfile(formData)
    message.value = { type: 'success', text: '個人資料已更新' }
    
    // Reset file input
    avatarFile.value = null
    if (fileInput.value) fileInput.value.value = ''
    
  } catch (err: any) {
    message.value = { type: 'error', text: err.message || '更新失敗，請稍後再試' }
  } finally {
    isLoading.value = false
  }
}

const handleChangePassword = async () => {
  if (newPassword.value !== confirmPassword.value) {
    message.value = { type: 'error', text: '新密碼確認不符' }
    return
  }
  
  isLoading.value = true
  message.value = { type: '', text: '' }
  
  try {
    await changePassword({
      oldPassword: oldPassword.value,
      password: newPassword.value,
      passwordConfirm: confirmPassword.value
    })
    message.value = { type: 'success', text: '密碼已變更' }
    
    // Clear fields
    oldPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (err: any) {
    message.value = { type: 'error', text: err.message || '變更密碼失敗，請確認舊密碼是否正確' }
  } finally {
    isLoading.value = false
  }
}

const handleLogout = async () => {
  if (confirm('確定要登出嗎？')) {
    await logout()
  }
}

const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="space-y-6">
    <!-- 頁面標題 -->
    <div class="flex items-center gap-3">
      <button 
        @click="goBack"
        class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors md:hidden"
      >
        <ArrowLeft :size="20" />
      </button>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">設定</h1>
    </div>

    <!-- 設定容器 -->
    <div class="flex flex-col md:flex-row gap-6">
      
      <!-- 左側分頁選單 -->
      <div class="w-full md:w-56 flex-shrink-0">
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <nav class="p-2 flex flex-col gap-1">
            <button 
              v-for="tab in tabs"
              :key="tab.key"
              @click="activeTab = tab.key"
              class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap w-full text-left"
              :class="activeTab === tab.key 
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
                : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'"
            >
              <component :is="tab.icon" :size="18" />
              <span class="flex-1">{{ tab.label }}</span>
              <ChevronRight 
                v-if="activeTab === tab.key" 
                :size="16" 
                class="text-indigo-400 dark:text-indigo-500" 
              />
            </button>
          </nav>
          
          <!-- 登出按鈕 (Demo 模式隱藏) -->
          <div v-if="!isDemoMode" class="p-2 border-t border-gray-100 dark:border-slate-800">
            <button 
              @click="handleLogout"
              class="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut :size="18" />
              登出
            </button>
          </div>

          <!-- Demo 模式提示 -->
          <div v-if="isDemoMode" class="p-2 border-t border-gray-100 dark:border-slate-800">
            <div class="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800/50">
              Demo 模式無法登出
            </div>
          </div>
        </div>
      </div>

      <!-- 右側內容區 -->
      <div class="flex-1 min-w-0">
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 md:p-8">
          
          <!-- Alert Message -->
          <Transition name="fade">
            <div v-if="message.text" 
              class="mb-6 p-4 rounded-xl flex items-start gap-3 text-sm"
              :class="message.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'"
            >
              <component :is="message.type === 'success' ? Check : AlertCircle" :size="18" class="flex-shrink-0 mt-0.5" />
              <span>{{ message.text }}</span>
            </div>
          </Transition>

          <!-- 個人資料 -->
          <div v-if="activeTab === 'profile'" class="space-y-8">
            <div>
              <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-1">個人資料</h2>
              <p class="text-sm text-gray-500 dark:text-slate-500">管理您的個人資訊與頭像</p>
            </div>

            <div class="flex flex-col items-center gap-8">
              <!-- 頭像 -->
              <div class="flex flex-col items-center gap-3">
                <div class="relative group">
                  <div class="w-28 h-28 rounded-full overflow-hidden bg-gray-100 dark:bg-slate-800 border-2 border-dashed border-gray-300 dark:border-slate-700 flex items-center justify-center">
                    <img v-if="avatarPreview" :src="avatarPreview" class="w-full h-full object-cover" />
                    <User v-else :size="48" class="text-gray-400" />
                  </div>
                  <button 
                    @click="triggerFileInput"
                    class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer"
                  >
                    <Upload :size="28" class="text-white" />
                  </button>
                  <input ref="fileInput" type="file" class="hidden" accept="image/*" @change="handleFileChange" />
                </div>
                <button @click="triggerFileInput" class="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                  更換頭像
                </button>
              </div>

              <!-- 表單 -->
              <div class="w-full max-w-md space-y-5">
                <div class="space-y-2">
                  <label class="text-sm font-medium text-gray-700 dark:text-slate-300">使用者名稱</label>
                  <input 
                    v-model="username"
                    type="text" 
                    id="username"
                    class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder="輸入新的使用者名稱"
                  />
                </div>
                
                <div class="space-y-2">
                  <label class="text-sm font-medium text-gray-700 dark:text-slate-300">電子郵件</label>
                  <input 
                    v-model="email"
                    type="email" 
                    readonly
                    disabled
                    class="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-slate-500 cursor-not-allowed outline-none"
                  />
                </div>

                <div class="pt-2 flex justify-end">
                  <button 
                    @click="handleUpdateProfile"
                    :disabled="isLoading"
                    class="px-8 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {{ isLoading ? '儲存中...' : '儲存變更' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 帳號安全 -->
          <div v-else-if="activeTab === 'security'" class="space-y-8">
            <div>
              <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-1">帳號安全</h2>
              <p class="text-sm text-gray-500 dark:text-slate-500">變更您的登入密碼</p>
            </div>

            <div v-if="isDemoMode" class="p-4 mb-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-200 dark:border-slate-700">
                <p class="text-sm text-gray-500 dark:text-slate-400">Demo 模式下無法修改密碼</p>
              </div>

            <div v-else class="flex flex-col items-center gap-8">

              <div class="w-full max-w-md space-y-5">
                <div class="space-y-2">
                  <label class="text-sm font-medium text-gray-700 dark:text-slate-300">舊密碼</label>
                  <input 
                    v-model="oldPassword"
                    type="password" 
                    class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder="輸入目前的密碼"
                  />
                </div>
                
                <div class="space-y-2">
                  <label class="text-sm font-medium text-gray-700 dark:text-slate-300">新密碼</label>
                  <input 
                    v-model="newPassword"
                    type="password" 
                    class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder="輸入新密碼 (至少 8 個字元)"
                  />
                </div>

                <div class="space-y-2">
                  <label class="text-sm font-medium text-gray-700 dark:text-slate-300">確認新密碼</label>
                  <input 
                    v-model="confirmPassword"
                    type="password" 
                    class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder="再次輸入新密碼"
                  />
                </div>

                <div class="pt-2 flex justify-end">
                  <button 
                    @click="handleChangePassword"
                    :disabled="isLoading || !oldPassword || !newPassword"
                    class="px-8 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {{ isLoading ? '更新中...' : '更新密碼' }}
                  </button>
                </div>
              </div>

            </div>

          </div>

          <!-- 外觀設定 -->
          <div v-else-if="activeTab === 'appearance'" class="space-y-8">
            <div>
              <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-1">外觀設定</h2>
              <p class="text-sm text-gray-500 dark:text-slate-500">自訂應用程式的外觀主題與字體大小</p>
            </div>

            <div class="flex flex-col items-center gap-8">

              <div class="w-full max-w-md space-y-4">
                <!-- 暗黑模式 -->
                <div class="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-slate-700">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm text-gray-600 dark:text-slate-300">
                      <component :is="isDark ? Moon : Sun" :size="20" />
                    </div>
                    <div class="flex flex-col">
                      <span class="font-medium text-gray-900 dark:text-white">{{ isDark ? '深色模式' : '淺色模式' }}</span>
                      <span class="text-xs text-gray-500 dark:text-slate-500">切換應用程式的主題顏色</span>
                    </div>
                  </div>
                  
                  <button 
                    @click="toggleDark"
                    class="relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    :class="isDark ? 'bg-indigo-600' : 'bg-gray-200'"
                  >
                    <span 
                      class="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-sm"
                      :class="isDark ? 'translate-x-6' : 'translate-x-0'"
                    ></span>
                  </button>
                </div>

                <!-- 字體大小 -->
                <div class="p-4 rounded-xl border border-gray-200 dark:border-slate-700 space-y-4">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm text-gray-600 dark:text-slate-300">
                      <Type :size="20" />
                    </div>
                    <div class="flex flex-col flex-1">
                      <span class="font-medium text-gray-900 dark:text-white">字體大小</span>
                      <span class="text-xs text-gray-500 dark:text-slate-500">調整全域文字大小 ({{ fontSize }}px)</span>
                    </div>
                  </div>
                  
                  <div class="px-2 pb-2">
                    <input 
                      v-model="fontSize" 
                      type="range" 
                      min="16" 
                      max="20" 
                      step="1" 
                      class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-indigo-600"
                    >
                    <div class="flex justify-between text-xs text-gray-400 mt-2 font-medium">
                      <span :class="{ 'text-indigo-600 dark:text-indigo-400': fontSize == 16 }">16px</span>
                      <span :class="{ 'text-indigo-600 dark:text-indigo-400': fontSize == 18 }">18px</span>
                      <span :class="{ 'text-indigo-600 dark:text-indigo-400': fontSize == 20 }">20px</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 關於 -->
          <div v-else-if="activeTab === 'about'" class="space-y-8">
            <div>
              <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-1">關於 PocketTrace</h2>
              <p class="text-sm text-gray-500 dark:text-slate-500">應用程式資訊</p>
            </div>

            <div class="flex flex-col items-center gap-8">

            <div class="w-full max-w-md">
              <div class="p-6 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700">
                <div class="flex flex-col items-center gap-4 mb-4">
                  <div class="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Info :size="32" />
                  </div>
                  <h3 class="text-lg font-bold text-gray-900 dark:text-white">PocketTrace</h3>
                </div>
                <p class="text-gray-600 dark:text-slate-400 leading-relaxed text-center">
                  PocketTrace 是一個 「個人數位指揮中心 (Personal Command Center)」 的 PWA 應用。
                </p>
              </div>
            </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
