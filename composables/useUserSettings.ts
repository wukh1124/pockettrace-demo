import { ref, watch, onMounted } from 'vue'

export function useUserSettings() {
  const fontSize = ref(18) // 預設字體大小為 18px

  onMounted(() => {
    // 嘗試從 localStorage 讀取已儲存的字體大小
    const savedFontSize = localStorage.getItem('fontSize')
    if (savedFontSize) {
      const parsedSize = parseInt(savedFontSize, 10)
      if (!isNaN(parsedSize) && parsedSize >= 16 && parsedSize <= 20) {
        fontSize.value = parsedSize
      }
    }
    
    // 初始化時即時套用字體大小
    applyFontSize(fontSize.value)
  })

  // 監聽 fontSize 變更，實時存入 localStorage 並套用至 HTML 根元素
  watch(fontSize, (newSize) => {
    localStorage.setItem('fontSize', newSize.toString())
    applyFontSize(newSize)
  })

  const applyFontSize = (size: number) => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.fontSize = `${size}px`
    }
  }

  return {
    fontSize
  }
}
