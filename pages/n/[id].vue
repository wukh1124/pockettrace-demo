<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { ArrowLeft, Calendar, Tag, Edit2 } from 'lucide-vue-next'
import { renderMarkdown } from '../../utils/markdown'

import { useAuth } from '../../composables/useAuth'

interface SharedNote {
  id: string
  title: string
  content: string
  tags: string[]
  share_enabled?: boolean
  published_at?: string
  created?: string
  updated?: string
}

const { user } = useAuth()
const route = useRoute()
const shareToken = computed(() => String(route.params.id || ''))

const isLoading = ref(true)
const errorMessage = ref('')
const note = ref<SharedNote | null>(null)

const renderedContent = computed(() => {
  if (!note.value) return ''
  return renderMarkdown(note.value.content)
})

const normalizeTags = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item))
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item))
      }
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    }
  }
  return []
}

const formatDate = (value?: string) => {
  if (!value) return '未提供'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

const loadSharedNote = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await fetch(`/api/public/notes/${shareToken.value}`)

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('not_found')
      }
      if (response.status === 403) {
        throw new Error('not_shared')
      }
      throw new Error('fetch_failed')
    }

    const data = await response.json()

    note.value = {
      id: data.id,
      title: data.title,
      content: data.content,
      tags: normalizeTags(data.tags),
      share_enabled: !!data.share_enabled,
      published_at: data.published_at,
      created: data.created,
      updated: data.updated,
    }
  } catch (error: any) {
    if (error?.message === 'not_found') {
      errorMessage.value = '找不到該分享連結，可能已被刪除。'
    } else if (error?.message === 'not_shared') {
      errorMessage.value = '此筆記未開啟分享。'
    } else {
      errorMessage.value = '讀取筆記內容失敗，請稍後再試。'
    }
    note.value = null
  } finally {
    isLoading.value = false
  }
}

onMounted(loadSharedNote)
</script>

<template>
  <div class="space-y-8">
    <!-- Header: 只有登入用戶才顯示返回按鈕 -->
    <div v-if="user" class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-1 z-10">
        <RouterLink
          to="/notes"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          title="返回筆記列表"
        >
          <ArrowLeft :size="20" />
        </RouterLink>
        <RouterLink
          v-if="note"
          :to="`/notes/${note.id}`"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          title="編輯筆記"
        >
          <Edit2 :size="18" />
        </RouterLink>
      </div>

      <div class="flex items-center gap-2">
        <span
          v-if="note"
          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
          :class="note.share_enabled ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50' : 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'"
        >
          <span class="relative flex h-2 w-2">
            <span
              v-if="note.share_enabled"
              class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
            ></span>
            <span
              class="relative inline-flex h-2 w-2 rounded-full"
              :class="note.share_enabled ? 'bg-emerald-500' : 'bg-slate-400'"
            ></span>
          </span>
          {{ note.share_enabled ? '已分享' : '未分享' }}
        </span>
        <span v-else class="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400 dark:text-indigo-300">Loading...</span>
      </div>
    </div>
    <!-- 分享狀態：非登入用戶只顯示分享狀態 -->

    <div
      v-if="isLoading"
      class="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 dark:border-slate-800/60 p-10 text-center text-sm text-slate-500 dark:text-slate-400"
    >
      正在載入筆記內容...
    </div>

    <div
      v-else-if="errorMessage"
      class="rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800/50 p-10 text-center text-sm text-rose-700 dark:text-rose-400"
    >
      {{ errorMessage }}
    </div>

    <article
      v-else-if="note"
      class="rounded-3xl border border-slate-200/70 bg-white shadow-2xl shadow-slate-200/40 dark:bg-slate-900 dark:border-slate-800/60 dark:shadow-none"
    >
      <div class="border-b border-slate-100 dark:border-slate-800 px-8 py-6">
        <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 font-semibold">
            <Calendar :size="14" />
            {{ formatDate(note.published_at || note.updated || note.created) }}
          </span>
          <div v-if="note.tags.length" class="flex flex-wrap gap-2">
            <span
              v-for="tag in note.tags"
              :key="tag"
              class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
            >
              <Tag :size="12" />
              {{ tag }}
            </span>
          </div>
        </div>
        <h1 class="mt-6 text-3xl font-black text-slate-900 dark:text-slate-100">
          {{ note.title }}
        </h1>
      </div>

      <div class="px-8 py-8">
        <div class="markdown-content space-y-4 text-sm" v-html="renderedContent"></div>
      </div>
    </article>
  </div>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.markdown-content :deep(h1) {
  @apply text-2xl font-bold mt-6 mb-4 text-slate-900 border-b border-slate-200 pb-2 dark:text-slate-100 dark:border-slate-700/50;
}
.markdown-content :deep(h2) {
  @apply text-xl font-bold mt-5 mb-3 text-slate-800 dark:text-slate-200;
}
.markdown-content :deep(h3) {
  @apply text-lg font-bold mt-4 mb-2 text-slate-800 dark:text-slate-200;
}
.markdown-content :deep(p) {
  @apply leading-relaxed mb-4 text-slate-700 dark:text-slate-300;
}
.markdown-content :deep(ul) {
  @apply list-disc ml-6 mb-4 space-y-1 text-slate-700 dark:text-slate-300;
}
.markdown-content :deep(ol) {
  @apply list-decimal ml-6 mb-4 space-y-1 text-slate-700 dark:text-slate-300;
}
.markdown-content :deep(blockquote) {
  @apply border-l-4 border-slate-200 pl-4 py-1 italic text-slate-600 bg-slate-50 rounded-r-md mb-4 dark:border-slate-700 dark:text-slate-400 dark:bg-slate-800/50;
}
.markdown-content :deep(code) {
  @apply bg-slate-100 px-1.5 py-0.5 rounded text-rose-500 font-mono text-[0.85em] dark:bg-slate-800 dark:text-rose-400;
}
.markdown-content :deep(pre) {
  @apply bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto mb-4 border border-transparent dark:border-slate-800;
}
.markdown-content :deep(pre code) {
  @apply bg-transparent p-0 text-inherit;
}
.markdown-content :deep(img) {
  @apply rounded-xl shadow-md max-w-full h-auto my-6 border border-slate-200 dark:border-slate-800;
}
.markdown-content :deep(hr) {
  @apply border-slate-200 my-8 dark:border-slate-800;
}
.markdown-content :deep(strong) {
  @apply font-bold text-slate-900 dark:text-slate-200;
}
.markdown-content :deep(a) {
  @apply text-indigo-600 dark:text-indigo-400 hover:underline;
}
</style>
