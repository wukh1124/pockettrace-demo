<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import {
  ArrowLeft,
  Save,
  Share2,
  Link as LinkIcon,
  Check,
  Calendar,
  RefreshCw,
  Trash2,
  Eye,
  MoreVertical,
  X,
} from 'lucide-vue-next'
import { MdEditor, MdPreview, NormalToolbar } from 'md-editor-v3'
import type { ToolbarNames } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import DOMPurify from 'dompurify'
import { useNotification } from '../../composables/useNotification'
import { authClient } from '../../utils/auth-client'
import { useConfirm } from '../../composables/useConfirm'

const route = useRoute()
const router = useRouter()
const { showNotice } = useNotification()
const { confirm } = useConfirm()

const noteId = computed(() => String(route.params.id || ''))
const isNew = computed(() => noteId.value === 'new' || noteId.value === '')

const title = ref('')
const content = ref('')
const tagsInput = ref('')
const publishedAt = ref('')
const isSaving = ref(false)
const errorMessage = ref('')

const activeTab = ref<'write' | 'preview'>('write')
const shareEnabled = ref(false)
const shareToken = ref('')
const shareExpiryMode = ref<'week' | 'never'>('never')
const copiedShare = ref(false)
const shareExpiresAt = ref<string | null>(null)

const showSettings = ref(false)
const isShareUpdating = ref(false)

const isDark = ref(false)
let observer: MutationObserver | null = null

const updateTheme = () => {
  isDark.value = document.documentElement.classList.contains('dark')
}

onMounted(() => {
  updateTheme()
  observer = new MutationObserver(updateTheme)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
  loadNote()
})

onUnmounted(() => {
  observer?.disconnect()
})

const toggleShareInstant = async () => {
  if (isNew.value) {
    shareEnabled.value = !shareEnabled.value
    return
  }
  
  isShareUpdating.value = true
  try {
    const nextState = !shareEnabled.value
    let token = shareToken.value
    
    if (nextState && !token) {
      token = generateShareToken()
      shareToken.value = token
    }
    
    await $fetch(`/api/notes/${noteId.value}`, {
      method: 'PATCH',
      body: {
        shareEnabled: nextState,
        shareToken: token
      }
    })
    
    shareEnabled.value = nextState
    showNotice(nextState ? '分享已啟用' : '分享已停用', 'success')
    
  } catch (err) {
    console.error(err)
    showNotice('更新分享狀態失敗', 'error')
  } finally {
    isShareUpdating.value = false
  }
}

const presetTags = ['工作', '個人', '靈感', '旅行', '日記']
const presetTagMap: Record<string, string> = {
  工作: 'work',
  個人: 'personal',
  靈感: 'ideas',
  旅行: 'travel',
  日記: 'diary',
}
const presetTagReverseMap: Record<string, string> = Object.fromEntries(
  Object.entries(presetTagMap).map(([label, value]) => [value, label])
)
const selectedPresetTags = ref<string[]>([])

const editorToolbars: ToolbarNames[] = [
  'bold',
  'italic',
  'strikeThrough',
  '-',
  'title',
  'quote',
  'code',
  'link',
  0,
  '-',
  'unorderedList',
  'orderedList',
  'task',
]

// === iOS 友好的圖片上傳 ===
const fileInputRef = ref<HTMLInputElement | null>(null)

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const onFileInputChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (files.length > 0) {
    handleUploadImg(files, (urls) => {
      // 將圖片 URL 以 markdown 語法插入編輯器
      const imgMarkdown = urls.map(url => `![](${url})`).join('\n')
      content.value += `\n${imgMarkdown}\n`
    })
  }
  // 清空 input，允許再次選擇同一檔案
  input.value = ''
}

const sanitizeHtml = (html: string) => DOMPurify.sanitize(html)

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

const parseTags = (raw: string) =>
  raw
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

const customTagList = computed(() => parseTags(tagsInput.value))

const removeCustomTag = (tag: string) => {
  const next = customTagList.value.filter((item) => item !== tag)
  tagsInput.value = next.join(', ')
}

const handleTagsInput = (event: KeyboardEvent) => {
  if (event.key === ' ' || event.key === ',' || event.key === 'Enter') {
    const value = tagsInput.value.trim()
    if (value.endsWith(',') || event.key === ',') {
      tagsInput.value = value.replace(/,+$/, '') + ', '
      return
    }
    if (event.key === ' ' || event.key === 'Enter') {
      tagsInput.value = value.replace(/\s+$/, '') + ', '
      event.preventDefault()
    }
  }
}

const buildTagsPayload = () => {
  const customTags = parseTags(tagsInput.value)
  // Ensure we respect the limit silently if user bypassed UI constraints
  const limitedCustomTags = customTags.slice(0, 5)
  const presetValues = selectedPresetTags.value.map((label) => presetTagMap[label]).filter(Boolean)
  // Ensure only one preset is used
  const limitedPresets = presetValues.slice(0, 1)
  const combined = [...limitedPresets, ...limitedCustomTags]
  return Array.from(new Set(combined))
}

const splitTagsForUI = (tags: string[]) => {
  const presets: string[] = []
  const custom: string[] = []
  tags.forEach((tag) => {
    const label = presetTagReverseMap[tag]
    if (label) {
      if (presets.length === 0) presets.push(label) // Only take first preset encountered
    } else {
      custom.push(tag)
    }
  })
  selectedPresetTags.value = presets
  tagsInput.value = custom.join(', ')
}

const formatPublishedAt = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 16)
}

const loadNote = async () => {
  if (isNew.value) return
  try {
    const data: any = await $fetch(`/api/notes/${noteId.value}`)
    title.value = data.title || ''
    content.value = data.content || ''
    const rawTags = normalizeTags(data.tags)
    splitTagsForUI(rawTags)
    publishedAt.value = formatPublishedAt(data.publishedAt || data.updatedAt)
    shareEnabled.value = Boolean(data.shareEnabled)
    shareToken.value = data.shareToken || ''
    shareExpiresAt.value = data.shareExpiresAt || null
    shareExpiryMode.value = shareExpiresAt.value ? 'week' : 'never'
  } catch (error) {
    console.error(error)
    errorMessage.value = '讀取筆記失敗，請稍後再試。'
  }
}

const handleSave = async () => {
  errorMessage.value = ''
  
  let finalTitle = title.value.trim()
  if (!finalTitle) {
    const now = new Date()
    const dateStr = now.toLocaleDateString('zh-TW')
    const timeStr = now.toLocaleTimeString('zh-TW', { hour12: false })
    const autoTitle = `未命名 @ ${dateStr} ${timeStr}`
    
    const confirmed = await confirm({
      title: '標題自動命名',
      message: `您尚未輸入標題，系統將自動命名為：\n"${autoTitle}"\n是否繼續儲存？`,
      confirmText: '儲存',
      cancelText: '返回修改'
    })
    
    if (!confirmed) return
    finalTitle = autoTitle
    title.value = autoTitle
  }
  
  if (parseTags(tagsInput.value).length > 5) {
    errorMessage.value = '自訂標籤最多只能有 5 個。'
    return
  }

  isSaving.value = true
  try {
    const payload: Record<string, any> = {
      title: finalTitle,
      content: content.value,
      tags: buildTagsPayload(),
      shareEnabled: shareEnabled.value,
    }

    if (publishedAt.value) {
      payload.publishedAt = new Date(publishedAt.value).toISOString()
    } else if (isNew.value) {
      payload.publishedAt = new Date().toISOString()
    }

    if (shareEnabled.value) {
      if (!shareToken.value) {
        shareToken.value = generateShareToken()
      }
      payload.shareToken = shareToken.value
      if (shareExpiryMode.value === 'week') {
        const now = Date.now()
        if (shareExpiresAt.value) {
          const existing = new Date(shareExpiresAt.value).getTime()
          if (!Number.isNaN(existing) && existing > now) {
            payload.shareExpiresAt = shareExpiresAt.value
          } else {
            shareExpiresAt.value = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString()
            payload.shareExpiresAt = shareExpiresAt.value
          }
        } else {
          shareExpiresAt.value = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString()
          payload.shareExpiresAt = shareExpiresAt.value
        }
      } else {
        shareExpiresAt.value = null
        payload.shareExpiresAt = null
      }
    }

    if (isNew.value) {
      await $fetch('/api/notes', { method: 'POST', body: payload })
      router.push({ path: '/notes', query: { notice: 'created' } })
    } else {
      await $fetch(`/api/notes/${noteId.value}`, { method: 'PATCH', body: payload })
      router.push({ path: '/notes', query: { notice: 'updated' } })
    }
  } catch (error) {
    console.error(error)
    errorMessage.value = '儲存失敗，請稍後再試。'
    showNotice('儲存失敗，請稍後再試。', 'error')
  } finally {
    isSaving.value = false
  }
}

const togglePresetTag = (label: string) => {
  // If clicking same tag, deselect it
  if (selectedPresetTags.value.includes(label)) {
    selectedPresetTags.value = []
  } else {
    // If clicking new tag, replace existing one (single choice)
    selectedPresetTags.value = [label]
  }
}

const shareUrl = computed(() => (shareToken.value && !isNew.value ? `${window.location.origin}/n/${shareToken.value}` : ''))

const generateShareToken = () => {
  if (crypto?.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '')
  }
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}


const copyShareLink = async () => {
  if (!shareToken.value) return
  const text = shareUrl.value
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const successful = document.execCommand('copy')
      document.body.removeChild(textarea)
      if (!successful) throw new Error('Copy command failed')
    }
    copiedShare.value = true
    showNotice('分享連結已複製', 'success')
    window.setTimeout(() => {
      copiedShare.value = false
    }, 2000)
  } catch (error) {
    console.error(error)
    showNotice('複製失敗，請手動複製連結。', 'error')
  }
}


const handleUploadImg = async (files: File[], callback: (urls: string[]) => void) => {
  const uploadedUrls: string[] = []

  for (const file of files) {
    // 前端檢查檔案大小（5MB）
    if (file.size > 5 * 1024 * 1024) {
      showNotice(`檔案「${file.name}」超過 5MB 限制，已跳過。`, 'error')
      continue
    }

    try {
      const formData = new FormData()
      formData.append('file', file)

      const result = await $fetch<{ urls: string[] }>('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (result.urls && result.urls.length > 0) {
        uploadedUrls.push(...result.urls)
      }
    } catch (err: any) {
      console.error('圖片上傳失敗：', err)
      const message = err?.data?.statusMessage || err?.message || '上傳失敗'
      showNotice(`圖片「${file.name}」上傳失敗：${message}`, 'error')
    }
  }

  if (uploadedUrls.length > 0) {
    callback(uploadedUrls)
    showNotice(`成功上傳 ${uploadedUrls.length} 張圖片`, 'success')
  }
}
const handleDelete = async () => {
  if (isNew.value) {
    router.push({ path: '/notes' })
    return
  }
  const confirmed = await confirm('確定要刪除這篇筆記嗎？此操作無法復原。')
  if (!confirmed) return
  try {
    await $fetch(`/api/notes/${noteId.value}`, { method: 'DELETE' })
    router.push({ path: '/notes', query: { notice: 'deleted' } })
  } catch (error) {
    console.error(error)
    showNotice('刪除失敗，請稍後再試。', 'error')
  }
}
</script>

<template>
  <div class="relative -mx-4 -mt-[calc(1rem+env(safe-area-inset-top))] mb-[-4rem] flex min-h-screen flex-col gap-4 bg-white dark:bg-slate-950 p-4 pb-10 md:mx-0 md:my-0 md:min-h-0 md:bg-transparent md:p-0 md:pb-10">

    <div class="flex flex-col gap-0 md:gap-0 md:bg-white md:dark:bg-slate-950">
      <!-- Top Navigation Bar -->
      <header
        class="sticky top-0 z-40 -mx-4 -mt-4 bg-white/95 dark:bg-slate-950/95 px-5 py-3 pt-[calc(1rem+env(safe-area-inset-top))] backdrop-blur transition-all md:static md:mx-0 md:mt-0 md:bg-transparent md:px-0 md:py-0"
      >
        <div class="relative flex items-center justify-between h-9 md:h-auto">
          <!-- Left: Back Button -->
          <div class="flex items-center gap-1 z-10">
            <RouterLink
              to="/notes"
              class="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="返回筆記列表"
            >
              <ArrowLeft :size="20" />
            </RouterLink>
            <!-- 瀏覽按鈕：只在分享啟用時可點擊 -->
            <button
              v-if="!isNew"
              :disabled="!shareEnabled"
              :title="shareEnabled ? '瀏覽筆記' : '請先啟用分享功能'"
              class="inline-flex h-9 w-9 items-center justify-center rounded-full transition"
              :class="
                shareEnabled
                  ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  : 'cursor-not-allowed text-slate-300 dark:text-slate-600'
              "
              @click="shareEnabled && router.push(`/n/${shareToken}`)"
            >
              <Eye :size="18" />
            </button>
          </div>

          <!-- Center: Title -->
          <span class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[20px] md:text-[26px] font-bold uppercase tracking-[0.2em] text-slate-800 dark:text-slate-200 pointer-events-none">
            EDITOR
          </span>

          <!-- Right: Actions -->
          <div class="flex items-center justify-end gap-3 z-10">

            
            <!-- More Settings Button -->
            <button
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              @click="showSettings = true"
            >
              <MoreVertical :size="20" />
            </button>
          </div>
        </div>
        
        <!-- Mobile Tabs & Save: Below header -->
        <div class="mt-3 flex gap-3 md:hidden">
          <div class="flex flex-1 items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-1 text-sm font-semibold shadow-inner">
            <button
              class="flex-1 rounded-lg py-1.5 text-[13px] transition-all"
              :class="activeTab === 'write' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'"
              @click="activeTab = 'write'"
            >
              Write
            </button>
            <button
              class="flex-1 rounded-lg py-1.5 text-[13px] transition-all"
              :class="activeTab === 'preview' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'"
              @click="activeTab = 'preview'"
            >
              Preview
            </button>
          </div>
          
          <button
            class="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
            :disabled="isSaving"
            @click="handleSave"
          >
            <span>{{ isSaving ? '...' : '儲存' }}</span>
          </button>
        </div>
      </header>

      <!-- Main Content Area: Title + Editor -->
      <main class="flex flex-col gap-4 md:gap-0">
        
        <!-- Title Input Section -->
        <div class="md:py-4">
          <div class="flex items-center justify-between">
            <label class="px-1 text-[18px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">標題</label>
            
            <div class="hidden md:flex items-center gap-3">
              <!-- Desktop Tabs -->
              <div class="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1 text-xs font-semibold">
                <button
                  class="rounded-lg px-4 py-1.5 transition-colors"
                  :class="activeTab === 'write' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
                  @click="activeTab = 'write'"
                >
                  Write
                </button>
                <button
                  class="rounded-lg px-4 py-1.5 transition-colors"
                  :class="activeTab === 'preview' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
                  @click="activeTab = 'preview'"
                >
                  Preview
                </button>
              </div>
              <!-- Save Button -->
              <button
                class="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                :disabled="isSaving"
                @click="handleSave"
              >
                <Save :size="16" />
                <span>{{ isSaving ? '儲存中...' : '儲存' }}</span>
              </button>
            </div>
          </div>
          <input
            v-model="title"
            type="text"
            placeholder="Untitled Note"
            class="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-[18px] font-bold text-slate-800 dark:text-white shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 md:bg-slate-50 md:dark:bg-slate-900"
            @input="errorMessage = ''"
          />
          <div
            v-if="errorMessage"
            class="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {{ errorMessage }}
          </div>
        </div>

        <!-- Editor Section -->
        <section class="flex flex-col min-h-[60vh] md:min-h-[500px]">
          <ClientOnly>
            <MdEditor
              v-if="activeTab === 'write'"
              v-model="content"
              :toolbars="editorToolbars"
              :preview="false"
              :htmlPreview="false"
              :footers="[]"
              :sanitize="sanitizeHtml"
              placeholder="Start writing your thoughts here..."
              class="md-editor-clean flex-1 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
              :theme="isDark ? 'dark' : 'light'"
              @onUploadImg="handleUploadImg"
            >
              <template #defToolbars>
                <NormalToolbar title="插入圖片" @onClick="triggerFileInput">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </NormalToolbar>
              </template>
            </MdEditor>
            <div v-else class="p-0 md:p-6 flex-1">
              <MdPreview :modelValue="content" :sanitize="sanitizeHtml" class="markdown-content space-y-4 text-sm" :theme="isDark ? 'dark' : 'light'" />
            </div>
            <template #fallback>
              <div class="flex-1 flex items-center justify-center text-slate-400">
                <span>載入編輯器中...</span>
              </div>
            </template>
          </ClientOnly>
          <!-- iOS 友好的隱藏檔案選擇器 -->
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            multiple
            style="display: none;"
            @change="onFileInputChange"
          />
        </section>

      </main>
    </div>


    <!-- Settings Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div 
          v-if="showSettings" 
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6"
          @click.self="showSettings = false"
        >
          <div class="flex flex-col w-full max-w-lg max-h-[85vh] bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <!-- Modal Header -->
            <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10">
              <h2 class="text-lg font-bold text-slate-800 dark:text-white">更多設定</h2>
              <button 
                class="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                @click="showSettings = false"
              >
                <X :size="20"/>
              </button>
            </div>

            <!-- Modal Content (Scrollable) -->
            <div class="flex-1 overflow-y-auto p-5 space-y-6">
              
              <!-- Share Section -->
              <section class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-5">
                <div class="flex items-center justify-between gap-4">
                  <div class="space-y-0.5">
                    <h3 class="text-sm font-bold text-slate-900 dark:text-white">分享設定</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400">分享連結可在未登入時閱讀</p>
                  </div>
                  <button
                    class="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                    :class="
                      shareEnabled
                        ? 'border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:text-rose-300'
                        : 'bg-indigo-600 text-white shadow-indigo-200 dark:shadow-none hover:bg-indigo-700'
                    "
                    type="button"
                    :disabled="isShareUpdating"
                    @click="toggleShareInstant"
                  >
                    <component :is="isShareUpdating ? RefreshCw : Share2" :size="14" :class="isShareUpdating ? 'animate-spin' : ''" />
                    {{ isShareUpdating ? '更新中...' : (shareEnabled ? '停用' : '啟用') }}
                  </button>
                </div>

                <div v-if="shareEnabled" class="mt-4 space-y-4">
                  <div class="flex flex-wrap items-center gap-3">
                    <label class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">到期時間</label>
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        class="rounded-full border px-3 py-1 text-xs font-semibold transition"
                        :class="
                          shareExpiryMode === 'week'
                            ? 'border-indigo-200 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        "
                        @click="shareExpiryMode = 'week'"
                      >
                        1 週
                      </button>
                      <button
                        type="button"
                        class="rounded-full border px-3 py-1 text-xs font-semibold transition"
                        :class="
                          shareExpiryMode === 'never'
                            ? 'border-indigo-200 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        "
                        @click="shareExpiryMode = 'never'"
                      >
                        永不
                      </button>
                    </div>
                    <span v-if="shareExpiryMode === 'week' && shareExpiresAt" class="text-xs text-slate-400">
                      目前到期：{{ new Date(shareExpiresAt).toLocaleDateString('zh-TW') }}
                    </span>
                  </div>

                  <div class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-3">
                    <div class="flex items-center justify-between gap-3">
                      <span class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">分享連結</span>
                      <button
                        type="button"
                        class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 transition hover:text-slate-700 dark:hover:text-white"
                        :class="!shareToken ? 'pointer-events-none cursor-not-allowed text-slate-300' : ''"
                        aria-label="複製分享連結"
                        @click="copyShareLink"
                      >
                        <component :is="copiedShare ? Check : LinkIcon" :size="14" />
                      </button>
                    </div>
                    <div class="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <LinkIcon :size="14" class="text-slate-400" />
                      <span class="min-w-0 flex-1 truncate">
                        {{ shareUrl || '尚未建立分享連結' }}
                      </span>
                    </div>
                    <!-- Buttons removed as requested -->
                  </div>
                </div>
              </section>

              <!-- Content Settings -->
              <section class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-5">
                <div class="space-y-4">
                  <div class="space-y-1">
                    <h3 class="text-sm font-semibold text-slate-900 dark:text-white">內容設定</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400">標籤與顯示時間管理。</p>
                  </div>
                  <div>
                    <label class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Tags</label>
                    <div class="mt-2 flex flex-wrap gap-2">
                      <button
                        v-for="tag in presetTags"
                        :key="tag"
                        type="button"
                        class="rounded-full border px-3 py-1 text-xs font-semibold transition"
                        :class="
                          selectedPresetTags.includes(tag)
                            ? 'border-indigo-200 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        "
                        @click="togglePresetTag(tag)"
                      >
                        {{ tag }}
                      </button>
                    </div>
                    <input
                      v-model="tagsInput"
                      type="text"
                      placeholder="自訂標籤，使用逗號分隔"
                      class="mt-3 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      @keydown="handleTagsInput"
                    />
                    <div v-if="customTagList.length" class="mt-3 flex flex-wrap gap-2">
                      <span
                        v-for="tag in customTagList"
                        :key="tag"
                        class="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400"
                      >
                        {{ tag }}
                        <button type="button" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" @click="removeCustomTag(tag)">
                          ×
                        </button>
                      </span>
                    </div>
                  </div>

                  <div class="grid min-w-0 gap-4 md:grid-cols-[auto_1fr] md:items-end">
                    <div class="min-w-0">
                      <label class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">顯示時間</label>
                      <div class="relative mt-2 w-full max-w-full sm:max-w-xs">
                        <input
                          v-model="publishedAt"
                          type="datetime-local"
                          class="calendar-input w-full min-w-0 max-w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                      </div>
                    </div>
                    <div class="text-xs text-slate-400">
                      若留白，新筆記會使用目前時間。
                    </div>
                  </div>

                  <div class="flex items-center justify-end border-t border-slate-200 dark:border-slate-800 pt-4">
                    <button
                      class="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-800 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-200 dark:shadow-none transition-all hover:bg-slate-800 dark:hover:bg-slate-700 hover:-translate-y-0.5"
                      type="button"
                      :disabled="isSaving"
                      @click="handleSave"
                    >
                      <Save :size="16" />
                      <span>{{ isSaving ? '儲存中...' : '保存設定' }}</span>
                    </button>
                  </div>
                </div>
              </section>

              <!-- Danger Zone -->
              <section v-if="!isNew" class="rounded-xl border border-rose-200 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-900/10 px-5 py-5">
                <div class="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 class="text-sm font-semibold text-rose-700 dark:text-rose-400">危險區域</h3>
                    <p class="text-xs text-rose-500/80 dark:text-rose-400/70">刪除筆記後無法復原。</p>
                  </div>
                  <button
                    class="inline-flex items-center gap-2 rounded-lg border border-rose-200 dark:border-rose-800/50 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 transition hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-700"
                    type="button"
                    @click="handleDelete"
                  >
                    <Trash2 :size="14" />
                    刪除筆記
                  </button>
                </div>
              </section>

            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
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

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(10px);
}

/* Use :deep to target child components in scoped styles */
/* Removed border: unset override to restore borders */

</style>
