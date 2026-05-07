<script setup lang="ts">
import { ref, watch } from 'vue'
import { X, Save, Image as ImageIcon, Upload, Loader2, Sparkles } from 'lucide-vue-next'
import { useNotification } from '~/composables/useNotification'
import type { Trip } from '~/types/Trips'

const props = defineProps<{
  show: boolean
  trip: Trip | null
}>()

const { showNotice } = useNotification()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', updatedTrip: Partial<Trip>): void
}>()

const isUploading = ref(false)
const isGenerating = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const form = ref({
  name: '',
  summary: '',
  destination: '',
  startDate: '',
  endDate: '',
  coverImage: '',
  status: ''
})

watch(() => props.trip, (newTrip) => {
  if (newTrip) {
    form.value = {
      name: newTrip.name || '',
      summary: newTrip.summary || '',
      destination: newTrip.destination || '',
      startDate: newTrip.startDate ? new Date(newTrip.startDate).toISOString().split('T')[0] : '',
      endDate: newTrip.endDate ? new Date(newTrip.endDate).toISOString().split('T')[0] : '',
      coverImage: newTrip.coverImage || '',
      status: newTrip.status || 'planning'
    }
  }
}, { immediate: true })

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const onFileInputChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (files.length > 0) {
    await handleUploadImg(files)
  }
  input.value = ''
}

const handleUploadImg = async (files: File[]) => {
  isUploading.value = true
  try {
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        showNotice(`檔案「${file.name}」超過 5MB 限制，已跳過。`, 'error')
        continue
      }

      const formData = new FormData()
      formData.append('file', file)

      const result = await $fetch<{ urls: string[] }>('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (result.urls && result.urls.length > 0) {
        form.value.coverImage = result.urls[0]
        showNotice('圖片上傳成功', 'success')
      }
    }
  } catch (err: any) {
    console.error('圖片上傳失敗：', err)
    const message = err?.data?.statusMessage || err?.message || '上傳失敗'
    showNotice(`圖片上傳失敗：${message}`, 'error')
  } finally {
    isUploading.value = false
  }
}

const handleGenerateCover = async () => {
  if (!form.value.destination) {
    showNotice('請先輸入「目的地」以便 AI 參考生成圖片。', 'error')
    return
  }
  isGenerating.value = true
  try {
    const result = await $fetch<any>('/api/trips/generate-cover', {
      method: 'POST',
      body: {
        name: form.value.name,
        destination: form.value.destination,
        flights: props.trip?.flights || [],
        itinerary: props.trip?.itinerary || []
      }
    })
    if (result.success && result.url) {
      form.value.coverImage = result.url
      showNotice('AI 圖片生成成功！', 'success')
    }
  } catch (err: any) {
    console.error('AI 生成圖片失敗：', err)
    const message = err?.data?.statusMessage || err?.message || '生成失敗'
    showNotice(`AI 圖片生成失敗：${message}`, 'error')
  } finally {
    isGenerating.value = false
  }
}

const handleSave = () => {
  emit('save', {
    ...form.value,
    status: form.value.status as any,
    startDate: form.value.startDate ? new Date(form.value.startDate).getTime() : null,
    endDate: form.value.endDate ? new Date(form.value.endDate).getTime() : null
  })
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" @click="emit('close')"></div>

    <!-- Modal Content -->
    <div class="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
      
      <!-- Header -->
      <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
        <h3 class="font-bold text-lg text-slate-900 dark:text-white">編輯旅程資訊</h3>
        <button @click="emit('close')" class="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 overflow-y-auto space-y-4">
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">旅程名稱</label>
          <input 
            v-model="form.name"
            type="text"
            placeholder="例如：東京五天四夜"
            class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">目的地</label>
          <input 
            v-model="form.destination"
            type="text"
            placeholder="例如：日本東京"
            class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">行程總結</label>
          <textarea 
            v-model="form.summary"
            rows="3"
            placeholder="為這趟旅程寫一段簡短的總結..."
            class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all resize-y"
          ></textarea>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-slate-700 dark:text-slate-300">開始日期</label>
            <input 
              v-model="form.startDate"
              type="date"
              class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-slate-700 dark:text-slate-300">結束日期</label>
            <input 
              v-model="form.endDate"
              type="date"
              class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">封面圖片網址</label>
          <div class="flex gap-2">
            <div class="flex-1 relative">
              <input 
                v-model="form.coverImage"
                type="text"
                placeholder="https://example.com/image.jpg"
                class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
              <ImageIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
            <button 
              type="button"
              @click="handleGenerateCover"
              :disabled="isGenerating || isUploading"
              class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-50 transition-all border border-indigo-200 dark:border-indigo-800"
            >
              <Loader2 v-if="isGenerating" class="w-4 h-4 animate-spin" />
              <Sparkles v-else class="w-4 h-4" />
              <span>AI 生成</span>
            </button>
            <button 
              type="button"
              @click="triggerFileInput"
              :disabled="isUploading || isGenerating"
              class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-all"
            >
              <Loader2 v-if="isUploading" class="w-4 h-4 animate-spin" />
              <Upload v-else class="w-4 h-4" />
              <span>上傳</span>
            </button>
            <input 
              ref="fileInputRef"
              type="file"
              accept="image/*"
              class="hidden"
              @change="onFileInputChange"
            />
          </div>
          <div v-if="form.coverImage" class="mt-2 relative group rounded-xl overflow-hidden aspect-video bg-slate-100 dark:bg-slate-900">
            <img :src="form.coverImage" class="w-full h-full object-cover" />
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button 
                type="button"
                @click="form.coverImage = ''"
                class="p-2 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-md transition-colors"
              >
                <X class="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">狀態</label>
          <select 
            v-model="form.status"
            class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          >
            <option value="planning" class="dark:bg-slate-800">規劃中</option>
            <option value="confirmed" class="dark:bg-slate-800">進行中</option>
            <option value="completed" class="dark:bg-slate-800">回憶</option>
          </select>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700/50 flex gap-3">
        <button
          @click="emit('close')"
          class="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          取消
        </button>
        <button
          @click="handleSave"
          class="flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm"
        >
          <Save class="w-4 h-4" />
          儲存變更
        </button>
      </div>

    </div>
  </div>
</template>
