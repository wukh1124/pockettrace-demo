<script setup lang="ts">
import { PlaneTakeoff, PlaneLanding, Clock, MapPin, Edit, Trash2 } from 'lucide-vue-next'
import type { TripFlight } from '~/types/Trips'

const props = defineProps<{
  flight: TripFlight
}>()

const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'delete'): void
}>()
</script>

<template>
  <div class="flex-shrink-0 w-[300px] sm:w-[350px] bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 snap-center relative overflow-hidden group">
    <!-- Decorative dots -->
    <div class="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-1 -mr-2">
      <div v-for="i in 10" :key="i" class="w-1.5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700"></div>
    </div>
    
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <span v-if="flight.segmentType" class="px-2 py-0.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
          {{ flight.segmentType }}
        </span>
        <div class="text-sm font-semibold text-slate-500 dark:text-slate-400">
          {{ flight.airline }}
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div class="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md">
          {{ flight.flightNumber }}
        </div>
        <div class="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button @click="emit('edit')" class="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            <Edit :size="14" />
          </button>
          <button @click="emit('delete')" class="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
            <Trash2 :size="14" />
          </button>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between mb-6">
      <div class="text-center">
        <div class="text-xl font-bold text-slate-900 dark:text-white mb-1">
          {{ flight.departureAirport }}
        </div>
        <div v-if="flight.departureAirportName" class="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
          {{ flight.departureAirportName }}
        </div>
        <div class="text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
          <PlaneTakeoff :size="14" /> {{ flight.departureTime }}
        </div>
      </div>

      <div class="flex-1 px-4 flex flex-col items-center">
        <div class="w-full h-[1px] border-b-2 border-dashed border-slate-300 dark:border-slate-600 relative">
          <PlaneTakeoff :size="16" class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-400 bg-white dark:bg-slate-800 px-1 w-6 h-6" />
        </div>
      </div>

      <div class="text-center">
        <div class="text-xl font-bold text-slate-900 dark:text-white mb-1">
          {{ flight.arrivalAirport }}
        </div>
        <div v-if="flight.arrivalAirportName" class="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
          {{ flight.arrivalAirportName }}
        </div>
        <div class="text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
          <PlaneLanding :size="14" /> {{ flight.arrivalTime }}
        </div>
      </div>
    </div>

    <div class="flex items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
      <div class="flex-1">
        <div class="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Gate</div>
        <div class="font-semibold text-slate-800 dark:text-slate-200">{{ flight.gate || '--' }}</div>
      </div>
      <div class="flex-1">
        <div class="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Seat</div>
        <div class="font-semibold text-slate-800 dark:text-slate-200">{{ flight.seat || '--' }}</div>
      </div>
    </div>
  </div>
</template>
