<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { stripMarkdownForPreview } from '../utils/stripMarkdown'

const props = defineProps<{
  content: string
  placement?: 'top' | 'bottom'
}>()

const isOpen = ref(false)
const tooltipRef = ref<HTMLElement | null>(null)
// Mobile detection: simple check or just assume if touch events fire
const isMobile = ref(false)
const tooltipStyle = ref<Record<string, string>>({})

const updatePosition = () => {
  if (!tooltipRef.value) return
  const rect = tooltipRef.value.getBoundingClientRect()
  
  if (props.placement === 'bottom') {
    tooltipStyle.value = {
      position: 'absolute',
      top: `${rect.bottom + window.scrollY + 8}px`,
      left: `${rect.left + window.scrollX}px`,
      width: '16rem' // w-64
    }
  } else {
    tooltipStyle.value = {
      position: 'absolute',
      top: `${rect.top + window.scrollY - 8}px`,
      left: `${rect.left + window.scrollX}px`,
      transform: 'translateY(-100%)',
      width: '16rem' // w-64
    }
  }
}

const handleMouseEnter = () => {
  if (!isMobile.value) {
    updatePosition()
    isOpen.value = true
  }
}

const handleMouseLeave = () => {
  if (!isMobile.value) {
    isOpen.value = false
  }
}

const handleClick = () => {
  // On mobile/touch, click toggles. On desktop, click might be text selection or ignored.
  // We can let click toggle it everywhere, ensuring it works.
  updatePosition()
  isOpen.value = !isOpen.value
}

// Close on outside click if open via click
const handleClickOutside = (event: MouseEvent) => {
  if (tooltipRef.value && !tooltipRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('click', handleClickOutside)
  isMobile.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
})

const formatContent = (text: string) => {
    // 使用共用的過濾函式，確保與 NoteCard 及字數計算一致
    const plain = stripMarkdownForPreview(text)
    return plain.length > 100 ? plain.substring(0, 100) + '...' : plain
}
</script>

<template>
  <div 
    ref="tooltipRef"
    class="relative inline-block"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @click="handleClick"
  >
    <!-- Trigger -->
    <slot></slot>

    <!-- Tooltip -->
    <ClientOnly>
      <Teleport to="body">
        <Transition name="fade">
          <div 
            v-if="isOpen && content"
            class="z-[9999] p-3 rounded-xl bg-slate-800 text-white text-xs shadow-xl leading-relaxed pointer-events-none md:pointer-events-auto"
            :style="tooltipStyle"
          > 
            <div class="font-medium text-slate-300 mb-1">內容預覽</div>
            <div>{{ formatContent(content) }}</div>
          </div>
        </Transition>
      </Teleport>
    </ClientOnly>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
