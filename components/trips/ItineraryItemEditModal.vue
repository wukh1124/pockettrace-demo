<script setup lang="ts">
import { ref, watch } from 'vue'
import { X, Save, Clock, MapPin, Info } from 'lucide-vue-next'
import type { TripItineraryItem } from '~/types/Trips'

const props = defineProps<{
  show: boolean
  item: TripItineraryItem | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', item: TripItineraryItem): void
}>()

const form = ref<TripItineraryItem>({
  timeSlot: 'morning',
  timeString: '',
  activity: '',
  location: '',
  notes: ''
})

watch(() => props.item, (newItem) => {
  if (newItem) {
    form.value = { ...newItem }
  } else {
    form.value = {
      timeSlot: 'morning',
      timeString: '',
      activity: '',
      location: '',
      notes: ''
    }
  }
}, { immediate: true })

const handleSave = () => {
  emit('save', { ...form.value })
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" @click="emit('close')"></div>
    <div class="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
      <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
        <h3 class="font-bold text-lg text-slate-900 dark:text-white">{{ item ? '編輯活動' : '新增活動' }}</h3>
        <button @click="emit('close')" class="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="p-6 overflow-y-auto space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-slate-700 dark:text-slate-300">時段</label>
            <select v-model="form.timeSlot" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
              <option value="morning" class="dark:bg-slate-800">早晨</option>
              <option value="afternoon" class="dark:bg-slate-800">下午</option>
              <option value="evening" class="dark:bg-slate-800">夜晚</option>
            </select>
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-slate-700 dark:text-slate-300">時間</label>
            <input v-model="form.timeString" type="text" placeholder="09:00" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">活動名稱</label>
          <input v-model="form.activity" type="text" placeholder="例如：參觀淺草寺" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">地點</label>
          <input v-model="form.location" type="text" placeholder="地點名稱" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">備註</label>
          <textarea v-model="form.notes" rows="3" placeholder="小提醒或備註..." class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"></textarea>
        </div>
      </div>

      <div class="px-6 py-4 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700/50 flex gap-3">
        <button @click="emit('close')" class="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">取消</button>
        <button @click="handleSave" class="flex-[2] flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm">
          <Save class="w-4 h-4" />
          {{ item ? '儲存' : '新增' }}
        </button>
      </div>
    </div>
  </div>
</template>
