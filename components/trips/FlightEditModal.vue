<script setup lang="ts">
import { ref, watch } from 'vue'
import { X, Save, Plane } from 'lucide-vue-next'
import type { TripFlight } from '~/types/Trips'

const props = defineProps<{
  show: boolean
  flight: TripFlight | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', flight: TripFlight): void
}>()

const form = ref<TripFlight>({
  segmentType: '去程',
  airline: '',
  flightNumber: '',
  departureTime: '',
  arrivalTime: '',
  departureAirport: '',
  arrivalAirport: '',
  departureAirportName: '',
  arrivalAirportName: '',
  gate: '',
  seat: ''
})

watch(() => props.flight, (newFlight) => {
  if (newFlight) {
    form.value = { ...newFlight }
  } else {
    form.value = {
      segmentType: '去程',
      airline: '',
      flightNumber: '',
      departureTime: '',
      arrivalTime: '',
      departureAirport: '',
      arrivalAirport: '',
      departureAirportName: '',
      arrivalAirportName: '',
      gate: '',
      seat: ''
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
        <h3 class="font-bold text-lg text-slate-900 dark:text-white">{{ flight ? '編輯航班' : '新增航班' }}</h3>
        <button @click="emit('close')" class="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="p-6 overflow-y-auto space-y-4">
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">航段類型</label>
          <select v-model="form.segmentType" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
            <option value="去程" class="dark:bg-slate-800">去程</option>
            <option value="回程" class="dark:bg-slate-800">回程</option>
            <option value="轉機" class="dark:bg-slate-800">轉機</option>
            <option value="其他" class="dark:bg-slate-800">其他</option>
          </select>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-slate-700 dark:text-slate-300">航空公司</label>
            <input v-model="form.airline" type="text" placeholder="例如：長榮航空" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-slate-700 dark:text-slate-300">航班號碼</label>
            <input v-model="form.flightNumber" type="text" placeholder="例如：BR192" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-slate-700 dark:text-slate-300">出發機場 (代碼)</label>
            <input v-model="form.departureAirport" type="text" placeholder="例如：TPE" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-slate-700 dark:text-slate-300">抵達機場 (代碼)</label>
            <input v-model="form.arrivalAirport" type="text" placeholder="例如：NRT" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-slate-700 dark:text-slate-300">出發地名/名稱 (選填)</label>
            <input v-model="form.departureAirportName" type="text" placeholder="例如：台北 (桃園)" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-slate-700 dark:text-slate-300">抵達地名/名稱 (選填)</label>
            <input v-model="form.arrivalAirportName" type="text" placeholder="例如：東京 (成田)" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-slate-700 dark:text-slate-300">出發時間</label>
            <input v-model="form.departureTime" type="text" placeholder="07:30" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-slate-700 dark:text-slate-300">抵達時間</label>
            <input v-model="form.arrivalTime" type="text" placeholder="11:45" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-slate-700 dark:text-slate-300">登機門</label>
            <input v-model="form.gate" type="text" placeholder="C5" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-slate-700 dark:text-slate-300">座位</label>
            <input v-model="form.seat" type="text" placeholder="12A" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
        </div>
      </div>

      <div class="px-6 py-4 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700/50 flex gap-3">
        <button @click="emit('close')" class="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors">取消</button>
        <button @click="handleSave" class="flex-[2] flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm">
          <Save class="w-4 h-4" />
          {{ flight ? '儲存' : '新增' }}
        </button>
      </div>
    </div>
  </div>
</template>
