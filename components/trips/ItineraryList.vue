<script setup lang="ts">
import { MapPin, Info, Sunrise, Sun, Moon, Edit, Trash2, Plus } from 'lucide-vue-next'
import type { TripItineraryDay, TripItineraryItem } from '~/types/Trips'

const props = defineProps<{
  day: TripItineraryDay
}>()

const emit = defineEmits<{
  (e: 'edit-item', itemIndex: number): void
  (e: 'delete-item', itemIndex: number): void
  (e: 'add-item'): void
  (e: 'delete-day'): void
}>()

const timeSlotConfig = {
  morning: { icon: Sunrise, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-500/20', label: '早晨' },
  afternoon: { icon: Sun, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-500/20', label: '下午' },
  evening: { icon: Moon, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-500/20', label: '夜晚' }
}

// 取得時間槽設定，若無效則回傳預設值
const getTimeSlotConfig = (timeSlot: string | undefined) => {
  return timeSlotConfig[timeSlot as keyof typeof timeSlotConfig] || timeSlotConfig.morning
}
</script>

<template>
  <div class="relative pl-6 sm:pl-8 py-2">
    <!-- Timeline Line -->
    <div class="absolute left-[11px] sm:left-[15px] top-0 bottom-0 w-[2px] bg-slate-200 dark:bg-slate-700"></div>

    <div class="space-y-6">
      <div v-for="(item, index) in day.items" :key="index" class="relative">
         
        <!-- Timeline Dot -->
        <div class="absolute -left-[30px] sm:-left-[34px] top-2 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 z-10" :class="getTimeSlotConfig(item.timeSlot).bg"></div>

        <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:border-indigo-300 dark:hover:border-indigo-500/50 group">
           
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0 w-12 flex flex-col items-center justify-center p-2 rounded-xl" :class="getTimeSlotConfig(item.timeSlot).bg">
              <component :is="getTimeSlotConfig(item.timeSlot).icon" class="w-5 h-5 mb-1" :class="getTimeSlotConfig(item.timeSlot).color" />
              <div class="text-[10px] font-medium" :class="getTimeSlotConfig(item.timeSlot).color">{{ item.timeString }}</div>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between">
                <h4 class="font-semibold text-slate-900 dark:text-white mb-1.5 text-base sm:text-lg">{{ item.activity }}</h4>
                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button @click="emit('edit-item', index)" class="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    <Edit :size="14" />
                  </button>
                  <button @click="emit('delete-item', index)" class="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                    <Trash2 :size="14" />
                  </button>
                </div>
              </div>
              
              <div class="space-y-1.5">
                <div v-if="item.location" class="flex items-start gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                  <MapPin class="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span class="break-words">{{ item.location }}</span>
                </div>
                
                <div v-if="item.notes" class="flex items-start gap-1.5 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg mt-2">
                  <Info class="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span class="break-words">{{ item.notes }}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      <!-- Add Item Button -->
      <div class="relative pl-2">
        <button 
          @click="emit('add-item')"
          class="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-indigo-500 transition-colors py-2"
        >
          <div class="w-6 h-6 rounded-full border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center">
            <Plus :size="14" />
          </div>
          新增活動...
        </button>
      </div>
    </div>
  </div>
</template>
