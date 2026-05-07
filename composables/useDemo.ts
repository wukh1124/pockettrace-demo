// composables/useDemo.ts
// 提供前端檢查 Demo 模式的功能
import { computed } from 'vue';

export function useDemo() {
  const config = useRuntimeConfig();
  
  // 檢查是否為 Demo 模式
  const isDemoMode = computed(() => {
    return config.public.isDemoMode === true;
  });

  // Demo 模式的提示訊息
  const demoMessage = computed(() => {
    if (!isDemoMode.value) return '';
    return 'Demo 預覽 - 資料僅供展示，無法登出';
  });

  return {
    isDemoMode,
    demoMessage
  };
}
