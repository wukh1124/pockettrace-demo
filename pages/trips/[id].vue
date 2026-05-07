<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft, Calendar as CalendarIcon, MapPin, Trash2, Edit, Plus, Download } from 'lucide-vue-next'
import { useTrips } from '~/composables/useTrips'
import { useDemo } from '~/composables/useDemo'
import FlightCard from '~/components/trips/FlightCard.vue'
import ItineraryList from '~/components/trips/ItineraryList.vue'
import TripEditModal from '~/components/trips/TripEditModal.vue'
import FlightEditModal from '~/components/trips/FlightEditModal.vue'
import ItineraryItemEditModal from '~/components/trips/ItineraryItemEditModal.vue'
import type { Trip, TripFlight, TripItineraryItem, TripItineraryDay } from '~/types/Trips'
import { generateTripMarkdown } from '~/utils/trip-markdown-generator'

const route = useRoute()
const router = useRouter()
const { getTrip, updateTrip, deleteTrip, loading } = useTrips()
const { isDemoMode } = useDemo()

const id = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id
const { data: trip } = await useAsyncData(`trip-${id}`, () => id ? getTrip(id) : Promise.resolve(null))

const showEditModal = ref(false)

// Flight editing
const showFlightModal = ref(false)
const editingFlightIndex = ref<number | null>(null)
const editingFlight = ref<TripFlight | null>(null)

// Itinerary item editing
const showItemModal = ref(false)
const editingDayIndex = ref<number | null>(null)
const editingItemIndex = ref<number | null>(null)
const editingItem = ref<TripItineraryItem | null>(null)

const goBack = () => {
  router.push('/trips')
}

const handleUpdate = async (updatedData: Partial<Trip>) => {
  if (trip.value?.id) {
    const result = await updateTrip(trip.value.id, updatedData)
    if (result) {
      trip.value = result
      showEditModal.value = false
    }
  }
}

// === Flight Logic ===
const openAddFlight = () => {
  editingFlightIndex.value = null
  editingFlight.value = null
  showFlightModal.value = true
}

const openEditFlight = (index: number) => {
  editingFlightIndex.value = index
  editingFlight.value = trip.value?.flights ? { ...trip.value.flights[index] } : null
  showFlightModal.value = true
}

const saveFlight = async (flightData: TripFlight) => {
  if (!trip.value) return
  const newFlights = [...(trip.value.flights || [])]
  if (editingFlightIndex.value !== null) {
    newFlights[editingFlightIndex.value] = flightData
  } else {
    newFlights.push(flightData)
  }
  await handleUpdate({ flights: newFlights })
  showFlightModal.value = false
}

const deleteFlight = async (index: number) => {
  if (!trip.value || !confirm('確定要刪除此航班嗎？')) return
  const newFlights = trip.value.flights?.filter((_, i) => i !== index) || []
  await handleUpdate({ flights: newFlights })
}

// === Itinerary Logic ===
const addDay = async () => {
  if (!trip.value) return
  const newItinerary = [...(trip.value.itinerary || [])]
  // Calculate next date or just empty
  const lastDay = newItinerary[newItinerary.length - 1]
  let nextDate = ''
  if (lastDay && lastDay.date) {
    const d = new Date(lastDay.date)
    d.setDate(d.getDate() + 1)
    nextDate = d.toISOString().split('T')[0]
  }
  newItinerary.push({ date: nextDate, items: [] })
  await handleUpdate({ itinerary: newItinerary })
}

const deleteDay = async (index: number) => {
  if (!trip.value || !confirm('確定要刪除整天行程嗎？')) return
  const newItinerary = trip.value.itinerary?.filter((_, i) => i !== index) || []
  await handleUpdate({ itinerary: newItinerary })
}

const openAddItem = (dayIndex: number) => {
  editingDayIndex.value = dayIndex
  editingItemIndex.value = null
  editingItem.value = null
  showItemModal.value = true
}

const openEditItem = (dayIndex: number, itemIndex: number) => {
  editingDayIndex.value = dayIndex
  editingItemIndex.value = itemIndex
  editingItem.value = trip.value?.itinerary ? { ...trip.value.itinerary[dayIndex].items[itemIndex] } : null
  showItemModal.value = true
}

const saveItem = async (itemData: TripItineraryItem) => {
  if (!trip.value || editingDayIndex.value === null) return
  const newItinerary = JSON.parse(JSON.stringify(trip.value.itinerary)) as TripItineraryDay[]
  if (editingItemIndex.value !== null) {
    newItinerary[editingDayIndex.value].items[editingItemIndex.value] = itemData
  } else {
    newItinerary[editingDayIndex.value].items.push(itemData)
  }
  await handleUpdate({ itinerary: newItinerary })
  showItemModal.value = false
}

const deleteItem = async (dayIndex: number, itemIndex: number) => {
  if (!trip.value || !confirm('確定要刪除此活動嗎？')) return
  const newItinerary = JSON.parse(JSON.stringify(trip.value.itinerary)) as TripItineraryDay[]
  newItinerary[dayIndex].items.splice(itemIndex, 1)
  await handleUpdate({ itinerary: newItinerary })
}

const handleDelete = async () => {
  if (confirm('確定要刪除這趟旅程嗎？此操作無法復原。')) {
    if (trip.value?.id) {
      await deleteTrip(trip.value.id)
      router.push('/trips')
    }
  }
}

const formatDate = (ts: number | null | undefined) => {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')
}

const getDayOfWeek = (ts: number) => {
  const days = ['日', '一', '二', '三', '四', '五', '六']
  return days[new Date(ts).getDay()]
}

const exportToMarkdown = () => {
  if (!trip.value) return

  const md = generateTripMarkdown(trip.value as unknown as Trip)

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${trip.value.name || 'Trip_Export'}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

</script>

<template>
  <div class="max-w-4xl mx-auto pb-24 h-full relative -mt-[calc(2rem+env(safe-area-inset-top,0px))] sm:mt-0" v-if="trip">
    <!-- Demo 模式橫幅 -->
    <div v-if="isDemoMode" class="mb-6 mx-4 sm:mx-0 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700">
      <span class="text-xs text-gray-500 dark:text-slate-400 font-medium">目前處於 Demo 模式</span>
    </div>

    <!-- Cover Image Header -->
    <div class="relative h-64 sm:h-80 -mx-4 sm:mx-0 sm:rounded-3xl overflow-hidden shadow-sm bg-slate-900 group">
      <img v-if="trip.coverImage" :src="trip.coverImage" class="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-70 transition-opacity" />
      <div v-else class="absolute inset-0 bg-gradient-to-br from-indigo-900 to-slate-900"></div>
      
      <!-- Top Nav -->
      <div class="absolute top-0 left-0 right-0 p-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] sm:pt-4 flex items-center justify-between z-10">
        <button @click="goBack" class="p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-colors">
          <ChevronLeft class="w-6 h-6" />
        </button>
        <div class="flex gap-2">
          <!-- 匯出功能 -->
          <button @click="exportToMarkdown" title="匯出行程" class="p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-colors">
            <Download class="w-5 h-5" />
          </button>
          <!-- 編輯功能 -->
          <button @click="showEditModal = true" class="p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-colors">
            <Edit class="w-5 h-5" />
          </button>
          <button @click="handleDelete" class="p-2 bg-black/20 hover:bg-red-500/80 backdrop-blur-md rounded-full text-white transition-colors">
            <Trash2 class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Title Area -->
      <div class="absolute bottom-0 left-0 right-0 p-6 sm:p-8 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent">
        <h1 class="text-3xl sm:text-4xl font-bold text-white mb-2 shadow-sm">{{ trip.name }}</h1>
        <div class="flex flex-wrap items-center gap-4 text-slate-200 text-sm">
          <div v-if="trip.destination" class="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
            <MapPin class="w-4 h-4" />
            {{ trip.destination }}
          </div>
          <div v-if="trip.startDate || trip.endDate" class="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
            <CalendarIcon class="w-4 h-4" />
            {{ formatDate(trip.startDate) }} <span v-if="trip.endDate">至</span> {{ formatDate(trip.endDate) }}
          </div>
        </div>
        <p v-if="trip.summary" class="mt-4 text-slate-300 text-sm leading-relaxed max-w-2xl hidden sm:block">
          {{ trip.summary }}
        </p>
      </div>
    </div>

    <!-- Summary for mobile -->
    <div v-if="trip.summary" class="mt-6 px-4 sm:hidden">
      <div class="bg-indigo-50/50 dark:bg-slate-800/50 px-4 py-3 rounded-xl text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        {{ trip.summary }}
      </div>
    </div>

    <div class="mt-8 space-y-12 px-4 sm:px-0">
      
      <!-- Flights Section -->
      <section>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-slate-900 dark:text-white">航班資訊</h3>
          <button 
            @click="openAddFlight"
            class="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 transition-colors"
          >
            <Plus :size="16" /> 新增航班
          </button>
        </div>
        
        <!-- Horizontal Scroll Container -->
        <div v-if="trip.flights && trip.flights.length > 0">
            <div 
              class="flex overflow-x-auto overflow-y-hidden gap-4 pb-6 snap-x scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 overscroll-behavior-x-contain"
              style="-webkit-overflow-scrolling: touch;"
            >
              <FlightCard 
                v-for="(flight, i) in trip.flights" 
                :key="i" 
                :flight="flight" 
                @edit="openEditFlight(i)"
                @delete="deleteFlight(i)"
              />
            </div>
        </div>
        <div v-else class="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-8 border border-dashed border-slate-200 dark:border-slate-700 text-center">
          <p class="text-slate-400 text-sm mb-3">尚無航班資訊</p>
          <button @click="openAddFlight" class="text-xs font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg">立即新增</button>
        </div>
      </section>

      <!-- Itinerary Section -->
      <section>
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold text-slate-900 dark:text-white">行程表</h3>
          <button 
            @click="addDay"
            class="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 transition-colors"
          >
            <Plus :size="16" /> 新增天數
          </button>
        </div>
        
        <div v-if="trip.itinerary && trip.itinerary.length > 0" class="space-y-10">
          <div v-for="(day, index) in trip.itinerary" :key="index">
            <div class="sticky top-16 sm:top-20 z-20 py-3 bg-slate-50 dark:bg-slate-900/95 backdrop-blur shadow-sm -mx-4 px-4 sm:mx-0 sm:rounded-xl mb-4 text-slate-800 dark:text-white font-bold flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span>Day {{ index + 1 }}</span>
                <input 
                  v-model="day.date" 
                  type="date"
                  class="bg-transparent border-none text-sm font-normal text-slate-500 dark:text-slate-400 focus:ring-0 p-0"
                  @change="handleUpdate({ itinerary: trip.itinerary })"
                />
              </div>
              <button @click="deleteDay(index)" class="text-slate-400 hover:text-red-500 transition-colors">
                <Trash2 :size="16" />
              </button>
            </div>
            
            <ItineraryList 
              :day="day" 
              @add-item="openAddItem(index)"
              @edit-item="(itemIdx) => openEditItem(index, itemIdx)"
              @delete-item="(itemIdx) => deleteItem(index, itemIdx)"
            />
          </div>
        </div>
        <div v-else class="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-12 border border-dashed border-slate-200 dark:border-slate-700 text-center">
          <p class="text-slate-400 text-sm mb-4">尚未建立行程內容</p>
          <button @click="addDay" class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-indigo-700">
            <CalendarIcon :size="16" /> 開始規劃第一天
          </button>
        </div>
      </section>

    </div>

    <!-- Modals -->
    <TripEditModal
      :show="showEditModal"
      :trip="trip"
      @close="showEditModal = false"
      @save="handleUpdate"
    />

    <FlightEditModal
      :show="showFlightModal"
      :flight="editingFlight"
      @close="showFlightModal = false"
      @save="saveFlight"
    />

    <ItineraryItemEditModal
      :show="showItemModal"
      :item="editingItem"
      @close="showItemModal = false"
      @save="saveItem"
    />
  </div>

  <div v-else-if="loading" class="flex items-center justify-center min-h-[50vh]">
    <div class="inline-block animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600 h-10 w-10"></div>
  </div>
</template>
