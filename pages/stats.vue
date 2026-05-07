<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { BarChart3 } from 'lucide-vue-next'

const usageData = ref<any>(null)
const isUsageLoading = ref(false)

onMounted(() => {
  fetchUsageStats()
})

async function fetchUsageStats() {
  isUsageLoading.value = true
  try {
    usageData.value = await $fetch('/api/chat/usage')
  } catch (e) {
    console.error('Failed to fetch usage stats', e)
  } finally {
    isUsageLoading.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
      <BarChart3 class="text-indigo-600" /> 系統統計
    </h1>

    <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 md:p-8">
      <h2 class="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-6">
        AI 聊天 Token 使用量
      </h2>
      
      <div v-if="isUsageLoading" class="flex flex-col items-center justify-center py-12 space-y-4">
        <div class="w-10 h-10 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
        <p class="text-sm text-gray-500">載入統計數據中...</p>
      </div>
      
      <div v-else-if="usageData" class="space-y-6">
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
            <p class="text-xs uppercase tracking-widest font-bold text-indigo-600 dark:text-indigo-400 mb-1">總消耗 Token</p>
            <p class="text-3xl font-black text-indigo-900 dark:text-indigo-100">{{ usageData.total.totalTokens?.toLocaleString() || 0 }}</p>
          </div>
          <div class="p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
            <p class="text-xs uppercase tracking-widest font-bold text-emerald-600 dark:text-emerald-400 mb-1">總對話次數</p>
            <p class="text-3xl font-black text-emerald-900 dark:text-emerald-100">{{ usageData.total.count?.toLocaleString() || 0 }}</p>
          </div>
          <div class="p-6 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900/30">
            <p class="text-xs uppercase tracking-widest font-bold text-amber-600 dark:text-amber-400 mb-1">總預估花費 (USD)</p>
            <p class="text-3xl font-black text-amber-900 dark:text-amber-100">${{ (usageData.total.totalCost || 0).toFixed(6) }}</p>
          </div>
        </div>

        <!-- By Model Breakdown -->
        <div class="mt-8">
          <h4 class="text-base font-bold text-gray-700 dark:text-gray-300 mb-4">各模型詳情</h4>
          <div class="grid gap-4 sm:grid-cols-2">
            <div v-for="stat in usageData.byModel" :key="stat.model" class="p-5 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
              <div class="flex items-center justify-between mb-4">
                <span class="text-sm font-bold text-gray-800 dark:text-gray-200">{{ stat.model }}</span>
                <span class="text-xs px-2.5 py-1 bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-400 rounded-full font-medium">{{ stat.count }} 次</span>
              </div>
              <div class="space-y-2.5">
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-500">提示 (Prompt)</span>
                    <span class="font-mono text-gray-700 dark:text-gray-300">{{ stat.totalPromptTokens?.toLocaleString() }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-500">生成 (Completion)</span>
                    <span class="font-mono text-gray-700 dark:text-gray-300">{{ stat.totalCompletionTokens?.toLocaleString() }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-500">預估花費 (USD)</span>
                    <span class="font-mono text-amber-600 dark:text-amber-400">${{ (stat.totalCost || 0).toFixed(6) }}</span>
                  </div>
                  <div class="relative pt-2">
                    <div class="overflow-hidden h-2 text-xs flex rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                      <div 
                        :style="`width: ${(stat.totalPromptTokens / stat.totalTokens) * 100}%`"
                        class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500 transition-all duration-500"
                      ></div>
                      <div 
                        :style="`width: ${(stat.totalCompletionTokens / stat.totalTokens) * 100}%`"
                        class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-400 opacity-60 transition-all duration-500"
                      ></div>
                    </div>
                  </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="text-center py-20 text-gray-500 border border-dashed border-gray-200 dark:border-slate-700 rounded-2xl">
        尚無使用數據
      </div>
      
      <div class="mt-8 pt-4 border-t border-gray-100 dark:border-slate-800">
        <p class="text-xs text-gray-400 dark:text-gray-500 text-center uppercase tracking-widest font-medium">數據僅供參考，實際費用依雲端服務供應商為準</p>
      </div>
    </div>
  </div>
</template>
