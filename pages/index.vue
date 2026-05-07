<script setup lang="ts">
import { 
  CloudSun, 
  Plus, 
  Map, 
  MessageSquare, 
  StickyNote, 
  Bell, 
  ArrowRight, 
  Calendar,
  CreditCard,
  Zap
} from 'lucide-vue-next';

// 獲取儀表板數據
const { data: summary, pending } = await useFetch('/api/dashboard/summary');

// 格式化日期
const formatDate = (date: string | number | Date) => {
  return new Date(date).toLocaleDateString('zh-TW', {
    month: 'short',
    day: 'numeric'
  });
};

// 計算訂閱狀態
const expiringCount = computed(() => summary.value?.expiringSubscriptions?.length || 0);
</script>

<template>
  <div class="space-y-8 pb-10">
    <!-- Header Area -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
          早安，歡迎回來！
        </h2>
        <p class="text-gray-500 dark:text-slate-400 mt-1">又是充滿活力的一天！</p>
      </div>
      
      <!-- Weather Card (Demo Mock) -->
      <div class="flex items-center gap-4 p-3 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-2xl backdrop-blur-md">
        <div class="bg-blue-500/20 p-2 rounded-xl">
          <CloudSun class="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <div class="text-sm font-medium text-blue-800 dark:text-blue-300">台北 26°C</div>
          <div class="text-xs text-blue-600/80 dark:text-blue-400/80">晴時多雲，適合出門走走</div>
        </div>
      </div>
    </div>

    <!-- Bento Grid Layout -->
    <div class="grid grid-cols-1 md:grid-cols-4 md:grid-rows-3 gap-6 h-auto">
      
      <!-- 1. Quick Actions (Right Top) -->
      <div class="md:col-span-1 md:row-span-2 order-2 md:order-1 flex flex-col gap-4">
        <NuxtLink to="/notes?action=new" class="flex-1 group relative overflow-hidden p-6 bg-indigo-600 rounded-3xl text-white shadow-lg shadow-indigo-200 dark:shadow-none hover:translate-y-[-2px] transition-all duration-300">
          <div class="relative z-10">
            <Plus class="w-8 h-8 mb-4 group-hover:scale-110 transition-transform" />
            <div class="font-bold text-lg">新筆記</div>
            <div class="text-indigo-100 text-sm mt-1">捕捉瞬間靈感</div>
          </div>
          <div class="absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:scale-125 transition-transform">
            <StickyNote class="w-32 h-32" />
          </div>
        </NuxtLink>
        
        <NuxtLink to="/trips" class="flex-1 group relative overflow-hidden p-6 bg-emerald-600 rounded-3xl text-white shadow-lg shadow-emerald-200 dark:shadow-none hover:translate-y-[-2px] transition-all duration-300">
          <div class="relative z-10">
            <Map class="w-8 h-8 mb-4 group-hover:scale-110 transition-transform" />
            <div class="font-bold text-lg">規劃旅程</div>
            <div class="text-emerald-100 text-sm mt-1">開啟新探險</div>
          </div>
          <div class="absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:scale-125 transition-transform">
            <Calendar class="w-32 h-32" />
          </div>
        </NuxtLink>

        <NuxtLink to="/chat" class="flex-1 group relative overflow-hidden p-6 bg-amber-500 rounded-3xl text-white shadow-lg shadow-amber-200 dark:shadow-none hover:translate-y-[-2px] transition-all duration-300">
          <div class="relative z-10">
            <MessageSquare class="w-8 h-8 mb-4 group-hover:scale-110 transition-transform" />
            <div class="font-bold text-lg">AI 聊天</div>
            <div class="text-amber-50 text-sm mt-1">聊聊天吧</div>
          </div>
          <div class="absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:scale-125 transition-transform">
            <Zap class="w-32 h-32" />
          </div>
        </NuxtLink>
      </div>

      <!-- 2. Subscription Alert (Center Top) -->
      <div class="md:col-span-3 md:row-span-1 order-1 md:order-2 p-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl shadow-sm flex items-center gap-6 overflow-hidden relative">
        <div :class="[expiringCount > 0 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500', 'p-4 rounded-2xl transition-colors']">
          <Bell v-if="expiringCount > 0" class="w-8 h-8 animate-bounce" />
          <CreditCard v-else class="w-8 h-8" />
        </div>
        
        <div class="flex-1">
          <div class="font-bold text-lg text-gray-800 dark:text-white">
            {{ expiringCount > 0 ? `有 ${expiringCount} 個訂閱即將到期！` : '訂閱狀態良好' }}
          </div>
          <div class="text-gray-500 dark:text-slate-400 text-sm mt-1">
            {{ expiringCount > 0 ? '請及時檢查您的付款資訊或決定是否續約。' : '目前沒有即將到期的支出，可以放心使用。' }}
          </div>
          
          <!-- Expiring items list -->
          <div v-if="expiringCount > 0" class="mt-4 flex flex-wrap gap-2">
            <div v-for="sub in summary?.expiringSubscriptions" :key="sub.id" class="px-3 py-1 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 text-xs rounded-full font-medium">
              {{ sub.name }} ({{ formatDate(sub.nextBillingDate) }})
            </div>
          </div>

        </div>

        <NuxtLink to="/subscriptions" class="p-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-full transition-colors group">
          <ArrowRight class="w-6 h-6 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-slate-300" />
        </NuxtLink>
      </div>

      <!-- 3. Recent Notes (Left Bottom) -->
      <div class="md:col-span-2 md:row-span-2 order-3 p-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-2">
            <StickyNote class="w-5 h-5 text-indigo-500" />
            <h3 class="font-bold text-gray-800 dark:text-white">最近筆記</h3>
          </div>
          <NuxtLink to="/notes" class="text-sm text-indigo-600 hover:underline">查看全部</NuxtLink>
        </div>
        
        <div class="space-y-4 flex-1">
          <template v-if="summary?.recentNotes?.length">
            <NuxtLink v-for="note in summary.recentNotes" :key="note.id" :to="`/notes?id=${note.id}`" 
              class="block p-4 rounded-2xl bg-gray-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-gray-100 dark:hover:border-slate-700 transition-all shadow-sm group">
              <div class="font-medium text-gray-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                {{ note.title || '無標題筆記' }}
              </div>
              <div class="text-xs text-gray-400 mt-2 flex items-center gap-2">
                <span>{{ formatDate(note.updatedAt) }}</span>
                <span v-if="note.tags?.length" class="text-gray-300 dark:text-slate-600">•</span>
                <span class="line-clamp-1">{{ Array.isArray(note.tags) ? note.tags.join(', ') : '' }}</span>
              </div>
            </NuxtLink>
          </template>
          <div v-else class="h-full flex flex-col items-center justify-center text-gray-400 py-10">
            <div class="bg-gray-100 dark:bg-slate-800 p-4 rounded-full mb-3">
              <StickyNote class="w-8 h-8 opacity-20" />
            </div>
            <p>還沒有筆記嗎？快點開始記錄吧！</p>
          </div>
        </div>
      </div>

      <!-- 4. Next Trip (Right Bottom) -->
      <div class="md:col-span-1 md:row-span-2 order-4 p-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col">
        <div class="flex items-center gap-2 mb-6">
          <Map class="w-5 h-5 text-emerald-500" />
          <h3 class="font-bold text-gray-800 dark:text-white">下一站</h3>
        </div>
        
        <div v-if="summary?.upcomingTrip" class="flex-1 flex flex-col">
          <div class="relative rounded-2xl overflow-hidden aspect-[4/3] mb-4 group">
            <img v-if="summary.upcomingTrip.coverImage" :src="summary.upcomingTrip.coverImage" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div v-else class="w-full h-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Map class="w-12 h-12 text-emerald-300" />
            </div>
            <div class="absolute top-3 left-3 px-2 py-1 bg-black/50 backdrop-blur-md rounded-lg text-[10px] text-white font-bold uppercase tracking-wider">
              Upcoming
            </div>
          </div>
          
          <h4 class="font-bold text-gray-800 dark:text-slate-200 line-clamp-1">{{ summary.upcomingTrip.name }}</h4>
          <div class="text-sm text-gray-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            <Calendar class="w-4 h-4" />
            {{ formatDate(summary.upcomingTrip.startDate) }}
          </div>
          
          <NuxtLink :to="`/trips?id=${summary.upcomingTrip.id}`" class="mt-auto pt-4 flex items-center justify-between text-emerald-600 font-medium group">
            查看行程
            <ArrowRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </NuxtLink>
        </div>
        
        <div v-else class="h-full flex flex-col items-center justify-center text-gray-400 py-10">
          <div class="bg-gray-100 dark:bg-slate-800 p-4 rounded-full mb-3 text-center">
             🌍
          </div>
          <p class="text-center text-sm">世界這麼大<br>不想去看看嗎？</p>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Bento Grid Hover Effects */
.rounded-3xl {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 滾動條美化 */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.2);
  border-radius: 10px;
}
</style>
