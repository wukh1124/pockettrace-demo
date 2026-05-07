<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useUserSettings } from './composables/useUserSettings'

// 載入並監聽使用者設定 (包含字體大小)
useUserSettings()

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover' }
  ],
  htmlAttrs: {
    lang: 'zh-TW'
  },
  // 在 head 中注入 inline script，在頁面 render 前就套用 dark mode 與 font size，避免閃爍
  script: [
    {
      innerHTML: `
        (function() {
          // Theme
          var theme = localStorage.getItem('theme');
          var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          var isDark = theme === 'dark' || (!theme && systemDark);
          if (isDark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          // 動態設定 theme-color，配合 iOS 狀態列與動態島顏色
          var themeColor = isDark ? '#020617' : '#ffffff';
          var meta = document.querySelector('meta[name="theme-color"]');
          if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'theme-color');
            document.head.appendChild(meta);
          }
          meta.setAttribute('content', themeColor);

          // Font Size
          var savedFontSize = localStorage.getItem('fontSize');
          if (savedFontSize) {
            var parsedSize = parseInt(savedFontSize, 10);
            if (!isNaN(parsedSize) && parsedSize >= 16 && parsedSize <= 20) {
              document.documentElement.style.fontSize = parsedSize + 'px';
            }
          } else {
            document.documentElement.style.fontSize = '18px';
          }
        })();
      `,
      type: 'text/javascript'
    }
  ]
})

// ===== iOS 橡皮筋效果（overscroll bounce）防禦 =====
let startY = 0

/**
 * 找到觸發觸控事件的最近可滾動祖先元素
 */
function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  while (el && el !== document.body && el !== document.documentElement) {
    try {
      const { overflowY } = window.getComputedStyle(el)
      if (overflowY === 'auto' || overflowY === 'scroll') {
        if (el.scrollHeight > el.clientHeight) {
          return el
        }
      }
    } catch (e) {}
    el = el.parentElement
  }
  
  // 如果找不到特定的滾動容器，回退到文件級別的滾動元素
  const scroller = (document.scrollingElement || document.documentElement) as HTMLElement
  if (scroller && scroller.scrollHeight > scroller.clientHeight) {
    return scroller
  }
  
  return null
}

function onTouchStart(e: TouchEvent) {
  if (e.touches.length > 0) {
    startY = e.touches[0].clientY
  }
}

function onTouchMove(e: TouchEvent) {
  // 若是多指觸控，不嘗試阻止
  if (e.touches.length > 1) return

  const el = getScrollParent(e.target as HTMLElement)

  // 若觸控的位置不屬於任何可滾動區域，直接阻止
  if (!el) {
    if (e.cancelable) e.preventDefault()
    return
  }

  const currentY = e.touches[0].clientY
  const isScrollingUp = currentY > startY   // 手指往下拉 → 內容往上滾
  const isScrollingDown = currentY < startY // 手指往上推 → 內容往下滾

  const scrollTop = el.scrollTop
  const clientHeight = el === document.scrollingElement ? window.innerHeight : el.clientHeight
  const scrollHeight = el.scrollHeight

  const isAtTop = scrollTop <= 0
  const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1

  // 已在頂部且繼續往下拉，或已在底部且繼續往上推 → 阻止橡皮筋
  if ((isAtTop && isScrollingUp) || (isAtBottom && isScrollingDown)) {
    if (e.cancelable) e.preventDefault()
  }
}

onMounted(() => {
  document.addEventListener('touchstart', onTouchStart, { passive: true })
  // passive 必須為 false 才能調用 e.preventDefault()
  document.addEventListener('touchmove', onTouchMove, { passive: false })
})

onUnmounted(() => {
  document.removeEventListener('touchstart', onTouchStart)
  document.removeEventListener('touchmove', onTouchMove)
})
</script>

<template>
  <GlobalNotification />
  <ConfirmDialog />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
