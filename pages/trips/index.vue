<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Sparkles, MapPin, Calendar, Plane } from 'lucide-vue-next'
import { useTrips } from '~/composables/useTrips'
import { useDemo } from '~/composables/useDemo'
import AIGenerateModal from '~/components/trips/AIGenerateModal.vue'

const router = useRouter()
const { trips, fetchTrips, createTrip, generateTripFromAI, loading } = useTrips()
const { isDemoMode } = useDemo()

const activeTab = ref<'planning' | 'confirmed' | 'completed'>('planning')

const tabs = [
  { id: 'planning', label: '規劃中' },
  { id: 'confirmed', label: '進行中' },
  { id: 'completed', label: '回憶' }
]

const filteredTrips = computed(() => {
  return trips.value.filter(t => t.status === activeTab.value)
})

// 使用 useAsyncData 進行 SSR 抓取
await useAsyncData('trips-data', async () => {
  await fetchTrips()
  return true
})

const showAIModal = ref(false)
const isGenerating = ref(false)

const handleAIGenerate = async (prompt: string) => {
  isGenerating.value = true
  try {
    const generatedData = await generateTripFromAI(prompt)
    if (generatedData) {
      // Generate success, create trip
      const newTrip = await createTrip({
        name: generatedData.name,
        destination: generatedData.destination,
        startDate: generatedData.startDate,
        endDate: generatedData.endDate,
        flights: generatedData.flights,
        itinerary: generatedData.itinerary,
        status: 'planning'
      })
      
      if (newTrip && newTrip.id) {
        showAIModal.value = false
        router.push(`/trips/${newTrip.id}`)
      }
    }
  } finally {
    isGenerating.value = false
  }
}

const handleManualCreate = async () => {
  const newTrip = await createTrip({
    name: '未命名旅程',
    status: 'planning'
  })
  if (newTrip && newTrip.id) {
    router.push(`/trips/${newTrip.id}`)
  }
}

const formatDate = (ts: number | null) => {
  if (!ts) return '未定'
  return new Date(ts).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="space-y-6 max-w-5xl mx-auto pb-20">
    <!-- Demo 模式橫幅 -->
    <div v-if="isDemoMode" class="mx-0 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-200 dark:border-slate-700">
      <div>
        <h3 class="font-bold text-gray-800 dark:text-slate-200">Demo 模式</h3>
        <p class="text-sm text-gray-500 dark:text-slate-400">
          AI 智能規劃旅程將返回示範訊息，不呼叫真實 API
        </p>
      </div>
    </div>

    <!-- Header -->
    <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div class="space-y-1">
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white">我的旅程</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">規劃與回顧你的精彩旅程</p>
      </div>

      <div class="flex gap-2 w-full md:w-auto">
        <button 
          @click="showAIModal = true"
          class="flex-1 md:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 dark:shadow-none hover:opacity-90 transition-all active:scale-95"
        >
          <Sparkles class="w-4 h-4" />
          AI 規劃
        </button>
        <button 
          @click="handleManualCreate"
          class="flex-1 md:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all active:scale-95"
        >
          <Plus class="w-4 h-4" />
          手動新增
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl overflow-x-auto scrollbar-hide">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id as any"
        class="flex-1 md:flex-none min-w-[100px] px-4 py-2 rounded-lg text-sm font-medium transition-all"
        :class="activeTab === tab.id 
          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'"
      >
        {{ tab.label }}
        <span class="ml-1.5 px-2 py-0.5 text-xs rounded-full"
          :class="activeTab === tab.id ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : 'bg-slate-200 text-slate-500 dark:bg-slate-800'">
          {{ trips.filter(t => t.status === tab.id).length }}
        </span>
      </button>
    </div>

    <!-- Content Status -->
    <div v-if="loading && trips.length === 0" class="py-20 text-center">
      <div class="inline-block animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600 h-8 w-8 mb-4"></div>
      <p class="text-slate-500">載入旅程中...</p>
    </div>

    <div v-else-if="filteredTrips.length === 0" class="py-20 text-center px-4">
      <div class="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <Plane class="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
      </div>
      <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">尚無{{ tabs.find(t => t.id === activeTab)?.label }}旅程</h3>
      <p class="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
        點擊上方按鈕，開始規劃你的下一趟旅程吧！AI 助理可以幫你快速安排行程。
      </p>
    </div>

    <!-- Grid -->
    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <router-link
        v-for="trip in filteredTrips"
        :key="trip.id"
        :to="`/trips/${trip.id}`"
        class="group flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-100 dark:hover:shadow-none transition-all active:scale-[0.98]"
      >
        <!-- Cover -->
        <div class="h-32 bg-slate-100 dark:bg-slate-900 relative overflow-hidden">
          <img v-if="trip.coverImage" :src="trip.coverImage" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div v-else class="absolute inset-0 flex items-center justify-center text-slate-300 dark:text-slate-700">
            <Plane class="w-10 h-10" />
          </div>
          <!-- Status Badge Overlay -->
          <div class="absolute top-3 right-3 px-2 py-1 bg-black/40 backdrop-blur-md rounded-md text-xs font-medium text-white shadow-sm">
            {{ trip.flights?.length || 0 }} 航班
          </div>
        </div>

        <!-- Info -->
        <div class="p-4 flex flex-col flex-1">
          <h3 class="font-bold text-slate-900 dark:text-white text-lg mb-1 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {{ trip.name }}
          </h3>
          
          <div class="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mt-auto pt-3">
            <MapPin class="w-3.5 h-3.5" />
            <span class="truncate">{{ trip.destination || '未設定目的地' }}</span>
          </div>
          
          <div class="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            <Calendar class="w-3.5 h-3.5" />
            <span>{{ formatDate(trip.startDate) }} - {{ formatDate(trip.endDate) }}</span>
          </div>
        </div>
      </router-link>
    </div>

    <AIGenerateModal
      :show="showAIModal"
      :is-generating="isGenerating"
      @close="showAIModal = false"
      @generate="handleAIGenerate"
    />
  </div>
</template>
