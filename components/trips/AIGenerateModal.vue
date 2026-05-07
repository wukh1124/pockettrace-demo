<script setup lang="ts">
import { ref, watch } from 'vue'
import { X, Sparkles, Loader2, Plane } from 'lucide-vue-next'
import { useDemo } from '~/composables/useDemo'

const props = defineProps<{
  show: boolean
  isGenerating?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'generate', prompt: string): void
}>()

const prompt = ref('')
const { isDemoMode } = useDemo()

// 當對話框開啟時清空輸入
watch(() => props.show, (newVal) => {
  if (newVal) {
    prompt.value = ''
  }
})

const handleGenerate = () => {
  if (!prompt.value.trim() || props.isGenerating) return
  emit('generate', prompt.value)
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" @click="!isGenerating && emit('close')"></div>

    <!-- Modal Content -->
    <div class="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative z-10 transform transition-all flex flex-col max-h-[90vh]">
       
      <!-- Header -->
      <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-900/10">
        <div class="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <Sparkles class="w-5 h-5" />
          <h3 class="font-bold text-lg">AI 智能規劃旅程</h3>
        </div>
        <button v-if="!isGenerating" @click="emit('close')" class="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 overflow-y-auto">
        <div v-if="!isGenerating">
          <div v-if="isDemoMode" class="p-3 mb-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700">
            <p class="text-xs text-gray-500 dark:text-slate-400">Demo 模式下將返回示範行程，不呼叫真實 AI</p>
          </div>

          <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">
            只需輸入你想去哪裡、預計天數與特別想去的景點，AI 將自動為你生成航班與早中晚行程表。
          </p>
          
          <textarea
            v-model="prompt"
            rows="5"
            placeholder="例如：明天出發去日本東京五天四夜，想去迪士尼、淺草跟秋葉原。搭乘長榮航空早上出發..."
            class="w-full w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all"
          ></textarea>
        </div>

        <div v-else class="flex flex-col items-center justify-center py-8">
          <div class="relative w-16 h-16 mb-6">
            <div class="absolute inset-0 border-4 border-indigo-100 dark:border-indigo-900/50 rounded-full"></div>
            <div class="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
            <Plane class="absolute inset-0 m-auto text-indigo-500 animate-pulse w-6 h-6" />
          </div>
          <p class="text-lg font-semibold text-slate-800 dark:text-slate-200">AI 正在為您規劃行程...</p>
          <p class="text-sm text-slate-500 mt-2">這通常需要約 60 秒的時間，請稍候</p>
        </div>
      </div>

      <!-- Footer -->
      <div v-if="!isGenerating" class="px-6 py-4 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700/50 flex gap-3">
        <button
          @click="emit('close')"
          class="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          取消
        </button>
        <button
          @click="handleGenerate"
          :disabled="!prompt.trim()"
          class="flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          <Sparkles class="w-4 h-4" />
          生成行程
        </button>
      </div>

    </div>
  </div>
</template>
