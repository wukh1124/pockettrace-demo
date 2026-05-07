<script setup lang="ts">
import { useNotification } from '../composables/useNotification'
import { Check, X, Info } from 'lucide-vue-next'

const { message, type, isVisible, closeNotice } = useNotification()
</script>

<template>
  <Transition name="slide-fade">
    <div
      v-if="isVisible"
      class="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-full border bg-white dark:bg-slate-900 pl-3 pr-2 py-2 text-xs font-semibold shadow-lg transition-all"
      :class="
        type === 'success'
          ? 'border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 shadow-emerald-100 dark:shadow-none'
          : type === 'error'
          ? 'border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 shadow-rose-100 dark:shadow-none'
          : 'border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-blue-100 dark:shadow-none'
      "
    >
      <span
        class="flex h-5 w-5 items-center justify-center rounded-full"
        :class="
          type === 'success'
            ? 'bg-emerald-100 dark:bg-emerald-900/30'
            : type === 'error'
            ? 'bg-rose-100 dark:bg-rose-900/30'
            : 'bg-blue-100 dark:bg-blue-900/30'
        "
      >
        <component
          :is="type === 'success' ? Check : type === 'error' ? X : Info"
          :size="12"
        />
      </span>
      <span class="dark:text-white mr-1">{{ message }}</span>
      <button
        type="button"
        class="flex h-5 w-5 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        @click="closeNotice"
      >
        <X :size="13" class="opacity-60" />
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
</style>
