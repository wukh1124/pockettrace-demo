<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { 
  Home, 
  Map, 
  NotebookText, 
  MoreHorizontal, 
  Settings, 
  CreditCard, 
  Grid,
  Menu,
  User,
  X,
  MessageSquare,
  BarChart3
} from 'lucide-vue-next'
import { useAuth } from '../composables/useAuth'
import { useDemo } from '../composables/useDemo'

// 狀態管理
const isDrawerOpen = ref(false)
const isCollapsed = ref(false)
const route = useRoute()

// Auth Data
const { user, getAvatarUrl } = useAuth()
const { isDemoMode, demoMessage } = useDemo()
const userAvatar = computed(() => getAvatarUrl(user.value))
const displayName = computed(() => user.value?.name || 'User')
const displayEmail = computed(() => user.value?.email || '')

// 導航項目定義 (TypeScript 類型安全)
interface NavItem {
  name: string
  path: string
  icon: any
}

const navItems: NavItem[] = [
  { name: '首頁', path: '/', icon: Home },
  { name: '筆記', path: '/notes', icon: NotebookText },
  { name: '旅程', path: '/trips', icon: Map },
  { name: '聊天', path: '/chat', icon: MessageSquare },
  { name: '統計', path: '/stats', icon: BarChart3 },
  { name: '訂閱', path: '/subscriptions', icon: CreditCard },
  { name: '應用', path: '/apps', icon: Grid },
]

// 判斷是否為當前路由
const isActive = (path: string) => route.path === path
const isNotesRoute = computed(() => route.path.startsWith('/notes'))
const isNotesItem = (path: string) => path === '/notes'
const isNavActive = (path: string) => isActive(path) || (isNotesItem(path) && isNotesRoute.value)

const navItemClass = (path: string) => (isNavActive(path) ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-slate-400')

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

const isPublicRoute = computed(() => {
  return route.path === '/login' || route.path === '/register' || route.path.startsWith('/n/')
})
const showNav = computed(() => user.value || !isPublicRoute.value)

// Dark Mode Toggle Logic (Keep for onMounted check, but UI moved to settings)
const isDark = ref(false)

// 偵測是否為 PWA 模式
const isPWA = ref(false)

onMounted(() => {
  // 檢查是否為 PWA (Standalone 模式)
  isPWA.value = window.matchMedia('(display-mode: standalone)').matches || 
                (window.navigator as any).standalone === true;

  // 在平板寬度下自動收起側邊欄，釋放編輯空間
  if (window.innerWidth < 1024 && window.innerWidth >= 768) {
    isCollapsed.value = true
  }

  const savedTheme = localStorage.getItem('theme')
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  
  if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
    isDark.value = true
    document.documentElement.classList.add('dark')
  } else {
    isDark.value = false
    document.documentElement.classList.remove('dark')
  }
})
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-slate-950 flex flex-col md:flex-row transition-colors duration-300 overflow-x-clip">
    
    <!-- Desktop Sidebar (md:flex) -->
    <aside 
      v-if="showNav"
      class="hidden md:flex flex-col h-screen sticky top-0 border-r border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 z-40 transition-[width] duration-300 ease-in-out overflow-hidden flex-shrink-0"
      :class="isCollapsed ? 'w-20' : 'w-64'"
    >
      <!-- ... (Sidebar content) ... -->
      <div class="flex flex-col h-full px-2 py-2">
        <!-- Header Section -->
        <div class="flex">
          <!-- Toggle Button (Top) -->
          <button 
            @click="toggleSidebar"
            class="w-12 h-12 flex items-center justify-center mb-4 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="切換選單"
          >
            <Menu :size="24" />
          </button>
        </div>

        <!-- Navigation -->
        <nav class="space-y-1 flex-1">
          <RouterLink 
            v-for="item in navItems" 
            :key="item.path" 
            :to="item.path"
            class="flex items-center h-12 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap overflow-hidden group relative"
            :class="isNavActive(item.path) 
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' 
              : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'"
            :title="isCollapsed ? item.name : ''"
          >
            <div class="flex items-center justify-center w-12 h-12 flex-shrink-0">
              <component :is="item.icon" :size="22" />
            </div>
            
            <div 
               class="transition-all duration-300 ease-in-out flex items-center h-full"
               :class="isCollapsed ? 'opacity-0' : 'opacity-100'"
            >
              <span>{{ item.name }}</span>
            </div>
          </RouterLink>

          <!-- Settings Item -->
          <RouterLink 
            to="/settings"
            class="flex items-center w-full h-12 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap overflow-hidden"
            :class="isNavActive('/settings') 
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' 
              : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'"
            :title="isCollapsed ? '設定' : ''"
          >
            <div class="flex items-center justify-center w-12 h-12 flex-shrink-0">
              <Settings :size="22" />
            </div>
            <div 
               class="transition-all duration-300 ease-in-out flex items-center h-full"
               :class="isCollapsed ? 'opacity-0' : 'opacity-100'"
            >
              <span>設定</span>
            </div>
          </RouterLink>
        </nav>

        <!-- Desktop Footer Actions (User Profile) -->
        <div 
          class="pt-2 border-t border-gray-200 dark:border-slate-800 flex transition-all duration-300 flex-col"
          :class="isCollapsed ? 'justify-center' : ''"
        >
          <!-- Demo Mode Banner (Desktop) -->
          <div 
            v-if="isDemoMode" 
            class="mb-2 px-2 py-1 rounded-lg bg-gray-100 dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 text-xs text-center"
            :class="isCollapsed ? 'mx-0' : 'mx-2'"
          >
            <template v-if="!isCollapsed">
              Demo 預覽
            </template>
            <template v-else>
              Demo
            </template>
          </div>
          <!-- User Profile Block -->
          <RouterLink 
            to="/settings"
            class="flex items-center w-full rounded-xl transition-all duration-300 hover:bg-gray-50 dark:hover:bg-slate-800/50 group overflow-hidden ease-in-out"
            :class="isCollapsed ? 'pt-2' : 'gap-3 pt-2 text-left'"
            :title="isCollapsed ? displayName : ''"
          >
            <!-- Avatar -->
            <div class="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 flex-shrink-0 overflow-hidden border border-gray-200 dark:border-slate-700 transition-all duration-300 group-hover:border-indigo-200">
              <ClientOnly>
                <div class="w-full h-full">
                  <img v-if="userAvatar" :src="userAvatar" class="w-full h-full object-cover" />
                  <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
                    <User :size="20" />
                  </div>
                </div>
                <template #fallback>
                  <div class="w-full h-full flex items-center justify-center text-gray-400">
                    <User :size="20" />
                  </div>
                </template>
              </ClientOnly>
            </div>
            
            <!-- User Info -->
            <div 
              class="flex flex-col whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out origin-left"
               :class="isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'"
            >
              <ClientOnly>
                <div class="flex flex-col">
                  <span class="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[140px]">
                    {{ displayName }}
                  </span>
                  <span class="text-xs text-gray-500 dark:text-slate-500 truncate max-w-[140px]">
                    {{ displayEmail }}
                  </span>
                </div>
                <template #fallback>
                  <div class="flex flex-col">
                    <span class="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[140px]">User</span>
                    <span class="text-xs text-gray-500 dark:text-slate-500 truncate max-w-[140px]">&nbsp;</span>
                  </div>
                </template>
              </ClientOnly>
            </div>
          </RouterLink>
        </div>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main class="flex-1 min-h-screen main-content-area px-4 md:p-8 transition-all duration-300 min-w-0">
      <div class="max-w-5xl mx-auto w-full">
        <slot />
      </div>
    </main>

    <!-- Mobile Bottom Navigation Area (Fixed at bottom) -->
    <div 
      v-if="showNav"
      class="md:hidden fixed bottom-0 left-0 right-0 z-50 flex flex-col transition-all duration-300"
    >
      <!-- Mobile Demo Banner (Now integrated into the bottom block) -->
      <div 
        v-if="isDemoMode"
        class="bg-indigo-50/95 dark:bg-slate-900/95 backdrop-blur-md text-indigo-600 dark:text-indigo-400 text-[10px] font-medium text-center py-1.5 border-t border-indigo-100 dark:border-indigo-900/30"
      >
        Demo 預覽 - 資料僅供展示
      </div>

      <!-- Navigation Bar -->
      <nav
        class="bg-white/98 dark:bg-slate-950/98 backdrop-blur-2xl border-t border-gray-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom,0px)] bottom-nav-bar"
      >
        <div class="flex justify-around items-center h-[65px] px-2 relative">
          <!-- Mobile Bottom Nav Items (Limit to first 3: Home, Notes, Trips) -->
          <RouterLink
            v-for="item in navItems.slice(0, 3)" 
            :key="item.path" 
            :to="item.path"
            class="flex flex-col items-center justify-center w-16 h-full gap-1 active:scale-95 transition-transform"
            :class="navItemClass(item.path)"
          >
            <component :is="item.icon" :size="24" :stroke-width="isNavActive(item.path) ? 2.5 : 2" />
            <span class="text-[10px] font-semibold tracking-tight">{{ item.name }}</span>
          </RouterLink>

          <!-- More / Drawer Trigger -->
          <button 
            @click="isDrawerOpen = true"
            class="flex flex-col items-center justify-center w-16 h-full gap-1 text-gray-500 dark:text-slate-400 active:scale-95 transition-transform"
          >
            <MoreHorizontal :size="24" />
            <span class="text-[10px] font-semibold tracking-tight">更多</span>
          </button>
        </div>
      </nav>
    </div>

    <!-- Mobile Drawer / Bottom Sheet -->
    <Transition name="fade">
      <div 
        v-if="isDrawerOpen" 
        class="fixed inset-0 bg-black/50 z-[60] md:hidden backdrop-blur-sm"
        @click="isDrawerOpen = false"
      ></div>
    </Transition>

    <Transition name="slide-up">
      <div 
        v-if="isDrawerOpen" 
        class="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-t-[2.5rem] p-6 z-[70] md:hidden shadow-2xl border-t border-gray-100 dark:border-slate-800 bottom-drawer"
      >
        <div class="w-12 h-1.5 bg-gray-300 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>
        
        <!-- User Profile Block (Mobile) -->
        <div class="flex items-center gap-4 mb-6">
           <div class="w-14 h-14 rounded-full bg-gray-100 dark:bg-slate-800 flex-shrink-0 overflow-hidden border border-gray-200 dark:border-slate-700">
            <ClientOnly>
              <div class="w-full h-full">
                <img v-if="userAvatar" :src="userAvatar" class="w-full h-full object-cover" />
                <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
                  <User :size="24" />
                </div>
              </div>
              <template #fallback>
                <div class="w-full h-full flex items-center justify-center text-gray-400">
                  <User :size="24" />
                </div>
              </template>
            </ClientOnly>
          </div>
          <div class="flex-1">
            <ClientOnly>
              <div class="flex flex-col">
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ displayName }}</h3>
                <p class="text-xs text-gray-500 dark:text-slate-500">{{ displayEmail }}</p>
              </div>
              <template #fallback>
                <div class="flex flex-col">
                  <h3 class="text-lg font-bold text-gray-900 dark:text-white">User</h3>
                  <p class="text-xs text-gray-500 dark:text-slate-500">&nbsp;</p>
                </div>
              </template>
            </ClientOnly>
          </div>
          
          <!-- Close Button -->
          <button 
            @click="isDrawerOpen = false"
            class="p-2 bg-gray-100 dark:bg-slate-800 rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X :size="20" />
          </button>
        </div>
        
        <!-- Demo Mode Banner (Mobile Drawer) -->
        <div 
          v-if="isDemoMode"
          class="mb-4 p-3 rounded-xl bg-gray-100 dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 text-sm text-center"
        >
          Demo 預覽<br>
          <span class="text-xs">資料僅供展示，無法登出</span>
        </div>

        <h3 class="text-sm font-medium text-gray-500 dark:text-slate-400 mb-4 uppercase tracking-wider">更多</h3>
        
        <div class="grid grid-cols-4 gap-4 mb-8">
          <!-- Render remaining nav items (Subscriptions, Apps) -->
          <RouterLink
            v-for="item in navItems.slice(3)" 
            :key="item.path"
            :to="item.path" 
            class="flex flex-col items-center gap-2"
            @click="isDrawerOpen = false"
          >
            <div 
              class="w-14 h-14 rounded-2xl flex items-center justify-center transition-colors"
              :class="isNavActive(item.path) ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'"
            >
              <component :is="item.icon" :size="24" />
            </div>
            <span 
              class="text-xs"
              :class="isNavActive(item.path) ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-600 dark:text-slate-400'"
            >{{ item.name }}</span>
          </RouterLink>

          <!-- Settings Item -->
          <RouterLink 
            to="/settings"
            class="flex flex-col items-center gap-2"
            @click="isDrawerOpen = false"
          >
            <div 
              class="w-14 h-14 rounded-2xl flex items-center justify-center transition-colors"
              :class="isNavActive('/settings') ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'"
            >
              <Settings :size="24" />
            </div>
            <span 
              class="text-xs"
              :class="isNavActive('/settings') ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-600 dark:text-slate-400'"
            >設定</span>
          </RouterLink>
        </div>
      </div>
    </Transition>



  </div>
</template>

<style scoped>
/* ===== iOS PWA 底部安全區域（使用 CSS class，不使用 inline style） ===== */

/* 主內容區域：頂部 + 底部留空避開導航 */
.main-content-area {
  padding-top: calc(2rem + env(safe-area-inset-top, 0px));
  /* 65px (nav) + 1.5rem (extra gap) + safe-area */
  padding-bottom: calc(80px + 2rem + env(safe-area-inset-bottom, 0px));
}

/* 底部導航列：移除固定的 height 限制，讓 flex-col 自適應內容 */
.bottom-nav-bar {
  padding-bottom: 0;
}

/* Drawer 面板：底部留出安全區域 */
.bottom-drawer {
  padding-bottom: calc(2rem + env(safe-area-inset-bottom, 0px));
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>
