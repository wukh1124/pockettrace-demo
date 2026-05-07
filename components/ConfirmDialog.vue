<script setup lang="ts">
import { useConfirm } from '../composables/useConfirm'
import { AlertTriangle, Info } from 'lucide-vue-next'

const { isVisible, title, message, confirmText, cancelText, onConfirm, onCancel } = useConfirm()

const handleConfirm = () => {
  onConfirm()
}

const handleCancel = () => {
  onCancel()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div 
        v-if="isVisible" 
        class="fixed inset-0 z-[100] flex items-center justify-center px-4"
      >
        <!-- Overlay -->
        <div 
          class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
          @click="handleCancel"
        ></div>

        <!-- Dialog -->
        <Transition name="scale">
          <div 
            v-if="isVisible"
            class="relative w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-gray-100 dark:border-slate-800 p-6 sm:p-8"
          >
            <div class="flex flex-col items-center text-center">
              <!-- Icon Header -->
              <div 
                class="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-500 dark:text-amber-400"
              >
                <AlertTriangle :size="32" stroke-width="2.5" />
              </div>

              <!-- Content -->
              <h3 class="mb-2 text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
                {{ title }}
              </h3>
              <p class="mb-8 text-base leading-relaxed text-gray-500 dark:text-slate-400">
                {{ message }}
              </p>

              <!-- Actions -->
              <div class="flex w-full flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  class="flex-1 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-4 text-sm font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all active:scale-95"
                  @click="handleCancel"
                >
                  {{ cancelText }}
                </button>
                <button
                  type="button"
                  class="flex-1 rounded-2xl bg-indigo-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95"
                  @click="handleConfirm"
                >
                  {{ confirmText }}
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.scale-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.scale-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.scale-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}

.scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
