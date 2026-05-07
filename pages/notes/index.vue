<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Grid2X2,
  List,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Briefcase,
  User,
  Lightbulb,
  Plane,
  Book,
  MoreHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  Archive,
} from 'lucide-vue-next'

import NoteTooltip from '../../components/NoteTooltip.vue'
import SharedNoteMenu from '../../components/SharedNoteMenu.vue'

import type { Note, TagId, NoteTag } from '../../types/Note'
import { TAGS, TAG_STYLES, TAG_LABELS } from '../../types/Note'
import { useNotes } from '../../composables/useNotes'
import NoteCard from '../../components/NoteCard.vue'
import { useConfirm } from '../../composables/useConfirm'

const router = useRouter()
const route = useRoute()

const {
  notes,
  isLoading,
  isAppending,
  errorMessage,
  shareBusy,
  setShareNotice,
  fetchNotes,
  toggleShare,
  toggleArchive,
  deleteNote: deleteNoteAction,
  currentPage,
  totalPages,
  totalItems,
} = useNotes()

const showArchived = ref(false)

const { confirm } = useConfirm()

// UI State
const viewModeInit = import.meta.client 
  ? ((localStorage.getItem('notesViewMode') as 'grid' | 'list') || 'grid') 
  : 'grid'
const viewMode = ref<'grid' | 'list'>(viewModeInit)

watch(viewMode, (newVal) => {
  if (import.meta.client) {
    localStorage.setItem('notesViewMode', newVal)
  }
})
const activeTag = ref<TagId>('all')
const searchQuery = ref('')
const activeMenuId = ref<string | null>(null)
const menuBtnRefs = ref<Record<string, HTMLElement>>({})
const menuPosition = ref({ top: 0, left: 0 })
const filterOpen = ref(false)
const selectedCustomTags = ref<string[]>([])
const copiedId = ref<string | null>(null)
const dateFilterStart = ref('')
const dateFilterEnd = ref('')
const loadTrigger = ref<HTMLElement | null>(null) // Sentinel for infinite scroll
const isLoadingMoreDelay = ref(false)

// Computed
const isListView = computed(() => viewMode.value === 'list')

const availableCustomTags = computed(() => {
  const primaryTagCandidates: NoteTag[] = ['work', 'personal', 'ideas', 'travel', 'diary']
  const pool = new Set<string>()
  // Note: This only shows tags from LOADED notes. 
  // Ideally this should be a separate aggregation query, but for now it's acceptable.
  notes.value.forEach((note) => {
    note.allTags?.forEach((tag: string) => {
      if (!primaryTagCandidates.includes(tag as NoteTag)) {
        pool.add(tag)
      }
    })
  })
  return Array.from(pool).sort()
})

const currentFilter = computed(() => {
  const parts: string[] = []
  
  // Search
  if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().replace(/["\\]/g, '\\$&') // escape quotes
      parts.push(`(title ~ "${q}" || content ~ "${q}")`)
  }
  
  // Tag
  if (activeTag.value !== 'all') {
       parts.push(`tags ~ "${activeTag.value}"`)
  }
  
  // Custom Tags
  if (selectedCustomTags.value.length > 0) {
      const tagsFilter = selectedCustomTags.value.map(t => `tags ~ "${t}"`).join(' && ')
      parts.push(`(${tagsFilter})`)
  }
  
  // Date Range
  if (dateFilterStart.value) {
      parts.push(`updated >= "${dateFilterStart.value} 00:00:00"`)
  }
  if (dateFilterEnd.value) {
       parts.push(`updated <= "${dateFilterEnd.value} 23:59:59"`)
  }
  
  // Archiving
  if (showArchived.value) {
      parts.push(`isArchived == true`)
  }
  
  return parts.join(' && ')
})

const sortField = ref<'wordCount' | 'created' | 'lastModified'>('lastModified')
const sortOrder = ref<'asc' | 'desc'>('desc')

const currentSortString = computed(() => {
  // If sorting by wordCount, let server sort by default (published_at) and client sort later
  if (sortField.value === 'wordCount') return '-published_at'
  
  let field = 'updated'
  if (sortField.value === 'created') field = 'created'
  if (sortField.value === 'lastModified') field = 'updated'
  
  const prefix = sortOrder.value === 'desc' ? '-' : '+'
  return `${prefix}${field}`
})

const toggleSort = (field: 'wordCount' | 'created' | 'lastModified') => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'desc'
  }
}

const orderedNotes = computed(() => {
  // If server side sort was used, notes are already sorted.
  // Unless field is wordCount, then we sort client side on the current page(s).
  if (sortField.value === 'wordCount') {
    const list = [...notes.value]
    return list.sort((a, b) => {
      const valA = a.wordCount || 0
      const valB = b.wordCount || 0
      if (valA === valB) return 0
      const result = valA > valB ? 1 : -1
      return sortOrder.value === 'asc' ? result : -result
    })
  }
  return notes.value
})

// watcher for refetching
let debounceTimer:  ReturnType<typeof setTimeout>
const triggerFetch = (resetPage = true) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    const page = resetPage ? 1 : currentPage.value
    // If viewMode is list, we don't append. If grid, and not resetting, we might append?
    // Actually, 'triggerFetch' usually implies filter change -> reset to page 1, replace.
    fetchNotes(page, false, currentFilter.value, currentSortString.value)
  }, 300)
}

watch([currentFilter, currentSortString], () => {
    triggerFetch(true)
})

// Infinite scroll handler
const loadNextPage = async () => {
  if (isLoading.value || isAppending.value || isLoadingMoreDelay.value || currentPage.value >= totalPages.value) return
  
  isLoadingMoreDelay.value = true
  
  // Wait 0.5s as requested
  await new Promise(resolve => setTimeout(resolve, 500))
  
  await fetchNotes(currentPage.value + 1, true, currentFilter.value, currentSortString.value)
  
  isLoadingMoreDelay.value = false
}

// Pagination handler
const changePage = async (page: number) => {
  if (page < 1 || page > totalPages.value || isLoading.value) return
  await fetchNotes(page, false, currentFilter.value, currentSortString.value)
  // scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const paginationRange = computed(() => {
    const total = totalPages.value
    const current = currentPage.value
    
    if (total <= 7) return Array.from({length: total}, (_, i) => i + 1)
    
    // Always show first, last, and window around current
    const pages: (number | string)[] = [1]
    
    // If current is > 4, we need dots at start
    if (current > 4) {
        pages.push('...')
    }
    
    // Determine middle range
    let start = Math.max(2, current - 1)
    let end = Math.min(total - 1, current + 1)
    
    // Adjust if near bounds to keep consistent number of items if possible
    if (current <= 4) {
        end = 5
        start = 2
    }
    if (current >= total - 3) {
        start = total - 4
        end = total - 1
    }
    
    for (let i = start; i <= end; i++) {
        pages.push(i)
    }
    
    if (current < total - 3) {
        pages.push('...')
    }
    
    pages.push(total)
    
    return pages
})

// Observer
let observer: IntersectionObserver | null = null




// Methods
const showNoticeFromQuery = () => {
  const notice = route.query.notice
  if (notice === 'created') {
    setShareNotice('success', '已新增筆記')
  } else if (notice === 'updated') {
    setShareNotice('success', '已儲存筆記')
  } else if (notice === 'deleted') {
    setShareNotice('success', '已刪除筆記')
  }
  if (notice) {
    router.replace({ query: {} })
  }
}

onMounted(() => {
  // Force loading state before the debounce timeout
  isLoading.value = true
  // Initial fetch
  triggerFetch(true)
  showNoticeFromQuery()
  
  // Setup IntersectionObserver for Grid View Infinite Scroll
  observer = new IntersectionObserver((entries) => {
    if (entries.length > 0) {
      const target = entries[0]!
      if (target.isIntersecting && !isListView.value) {
        loadNextPage()
      }
    }
  }, {
    root: null,
    threshold: 0.1,
  })
})

// Watch loadTrigger ref to attach observer
watch(loadTrigger, (el) => {
  if (observer && el) {
    observer.observe(el)
  }
})

watch(
  () => route.query.notice,
  () => {
    showNoticeFromQuery()
  }
)

const createNote = () => {
  router.push('/notes/new')
}

const openEditor = (note: Note) => {
  closeMenu()
  router.push(`/notes/${note.id}`)
}

const openViewer = (note: Note) => {
  closeMenu()
  // 若未開啟分享，改為前往編輯頁
  if (!note.shareEnabled) {
    router.push(`/notes/${note.id}`)
  } else {
    router.push(`/n/${note.shareToken}`)
  }
}

const toggleMenu = (noteId: string) => {
  if (activeMenuId.value === noteId) {
    activeMenuId.value = null
    return
  }
  // 計算按鈕位置
  const btn = menuBtnRefs.value[noteId]
  if (btn) {
    const rect = btn.getBoundingClientRect()
    menuPosition.value = {
      top: rect.bottom + 4,
      left: rect.right - 128, // w-32 = 128px，讓選單靠右對齊
    }
  }
  activeMenuId.value = noteId
}

const closeMenu = () => {
  activeMenuId.value = null
}

const closeOverlays = () => {
  closeMenu()
  filterOpen.value = false
}

const toggleFilter = () => {
  filterOpen.value = !filterOpen.value
}

const toggleCustomTag = (tag: string) => {
  if (selectedCustomTags.value.includes(tag)) {
    selectedCustomTags.value = selectedCustomTags.value.filter((item) => item !== tag)
  } else {
    selectedCustomTags.value = [...selectedCustomTags.value, tag]
  }
}

const clearCustomTags = () => {
  selectedCustomTags.value = []
}

// Actions delegated to Composable or handled locally
const handleDeleteNote = async (note: Note) => {
  if (shareBusy.value[note.id]) return
  const confirmed = await confirm(`確定要刪除「${note.title}」嗎？此操作無法復原。`)
  if (!confirmed) return
  closeMenu()
  await deleteNoteAction(note)
}

const handleToggleShare = (note: Note) => {
  closeMenu()
  toggleShare(note)
}

const handleToggleArchive = async (note: Note) => {
  closeMenu()
  await toggleArchive(note)
  triggerFetch(true)
}

// Copy Logic (UI specific)
const getShareUrl = (shareToken?: string) => {
  if (!shareToken) return ''
  return `${window.location.origin}/n/${shareToken}`
}

const copyShareLink = async (note: Note) => {
  const text = getShareUrl(note.shareToken)
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
    copiedId.value = note.shareToken || note.id
    setShareNotice('success', '已複製分享連結')
    window.setTimeout(() => {
      if (copiedId.value === note.id) {
        copiedId.value = null
      }
    }, 2000)
  } catch (error) {
    console.error(error)
    setShareNotice('error', '複製失敗，請手動複製連結。')
  }
}

const openSharePreview = (note: Note) => {
  closeMenu()
  window.open(getShareUrl(note.shareToken), '_blank', 'noopener')
}
</script>

<template>
  <div class="space-y-6" @click="closeOverlays">
    <section class="flex flex-col gap-5">
      <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white">我的筆記</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">管理與整理你的想法 (目前共 {{ totalItems }} 篇筆記)</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <div class="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 shadow-sm transition-colors">
            <button
              class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
              :class="isListView ? 'bg-slate-900 dark:bg-slate-700 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
              @click="viewMode = 'list'"
            >
              <List :size="18" />
              清單
            </button>
            <button
              class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
              :class="!isListView ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
              @click="viewMode = 'grid'"
            >
              <Grid2X2 :size="18" />
              格狀
            </button>
          </div>
          <button
            class="ml-auto inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 dark:shadow-none transition-colors hover:bg-indigo-700"
            @click="createNote"
          >
            <Plus :size="18" />
            新增筆記
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-3 md:flex-row md:items-center">
        <div class="relative flex-1 min-w-[220px] md:max-w-md">
          <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" :size="18" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜尋筆記..."
            class="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-3 pl-11 pr-10 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
          />
          <button
            v-if="searchQuery"
            class="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-100 dark:bg-slate-800 p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            @click="searchQuery = ''"
          >
            <X :size="14" />
          </button>
        </div>
        <div class="flex w-full items-center gap-2 overflow-x-auto md:w-auto md:pb-0 no-scrollbar">
          <button
            v-for="tag in TAGS"
            :key="tag.id"
            class="flex flex-shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-semibold transition-colors"
            :class="
              activeTag === tag.id
                ? 'border-slate-900 dark:border-slate-700 bg-slate-900 dark:bg-slate-700 text-white'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            "
            @click="activeTag = activeTag === tag.id ? 'all' : tag.id"
            :title="tag.label"
          >
            <component 
              :is="
                tag.icon === 'Sparkles' ? Sparkles :
                tag.icon === 'Briefcase' ? Briefcase :
                tag.icon === 'User' ? User :
                tag.icon === 'Lightbulb' ? Lightbulb :
                tag.icon === 'Plane' ? Plane :
                tag.icon === 'Book' ? Book : Sparkles
              " 
              :size="16" 
            />
            <span class="hidden md:inline">{{ tag.label }}</span>
          </button>
          
          <button
            class="flex flex-shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-semibold transition-colors"
            :class="
              showArchived
                ? 'border-slate-900 dark:border-slate-700 bg-slate-900 dark:bg-slate-700 text-white'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            "
            @click="showArchived = !showArchived"
            title="已封存"
          >
           <Archive :size="16" />
           <span class="hidden md:inline">已封存</span>
          </button>
          
          <div class="mx-2 h-6 w-px bg-slate-200 dark:bg-slate-700 hidden md:block"></div>


          <button
            class="ml-auto flex flex-shrink-0 h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
            aria-label="進階篩選"
            @click.stop="toggleFilter"
          >
            <SlidersHorizontal :size="16" />
          </button>
        </div>
      </div>

      <div v-if="filterOpen" class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm" @click.stop>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-slate-900 dark:text-slate-200">自訂標籤篩選</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">選擇一或多個標籤，符合全部條件。</p>
          </div>
          <button
            class="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            type="button"
            @click="clearCustomTags"
          >
            清除
          </button>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="tag in availableCustomTags"
            :key="tag"
            type="button"
            class="rounded-full border px-3 py-1 text-xs font-semibold transition"
            :class="
              selectedCustomTags.includes(tag)
                ? 'border-indigo-200 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            "
            @click="toggleCustomTag(tag)"
          >
            {{ tag }}
          </button>
          <span v-if="availableCustomTags.length === 0" class="text-xs text-slate-400">目前沒有自訂標籤</span>
        </div>
      </div>
    </section>

    <section>
      <div v-if="isLoading">
        <!-- List View Skeleton -->
        <div v-if="isListView" class="space-y-4">
          <div class="w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th class="px-6 py-3"><div class="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div></th>
                    <th class="px-6 py-3 w-24"><div class="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div></th>
                    <th class="px-6 py-3 w-32"><div class="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div></th>
                    <th class="px-6 py-3 w-24"><div class="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div></th>
                    <th class="px-6 py-3 w-56"><div class="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div></th>
                    <th class="px-6 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr v-for="i in 5" :key="i">
                    <td class="px-6 py-4"><div class="h-4 w-1/2 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div></td>
                    <td class="px-6 py-4"><div class="h-3 w-8 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div></td>
                    <td class="px-6 py-4"><div class="h-5 w-16 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse"></div></td>
                    <td class="px-6 py-4"><div class="h-4 w-12 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div></td>
                    <td class="px-6 py-4"><div class="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div></td>
                    <td class="px-6 py-4"><div class="h-6 w-6 bg-slate-100 dark:bg-slate-800 rounded animate-pulse ml-auto"></div></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <!-- Grid View Skeleton -->
        <div v-else class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="i in 6"
            :key="i"
            class="flex h-48 flex-col gap-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"
          >
            <div class="flex items-center justify-between">
              <div class="h-6 w-16 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
              <div class="h-8 w-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
            <div class="space-y-3">
              <div class="h-6 w-3/4 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              <div class="space-y-2">
                <div class="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                <div class="h-4 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            </div>
            <div class="mt-auto flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-3">
              <div class="h-4 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              <div class="h-6 w-16 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
            </div>
          </div>
        </div>
      </div>

      <div
        v-else-if="errorMessage"
        class="rounded-2xl border border-dashed border-rose-200 bg-rose-50 p-10 text-center text-sm text-rose-700"
      >
        {{ errorMessage }}
      </div>

      <div
        v-else-if="orderedNotes.length === 0"
        class="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center"
      >
        <p class="text-sm font-semibold text-slate-500 dark:text-slate-400">目前沒有符合的筆記</p>
        <p class="mt-2 text-xs text-slate-400 dark:text-slate-500">調整搜尋條件或新增一則筆記吧。</p>
      </div>

      <div v-else>
        <!-- Table View with Pagination -->
        <div v-if="isListView" class="space-y-4">
          <div class="w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th class="px-6 py-3 font-semibold whitespace-nowrap">標題</th>
                    <th class="px-6 py-3 font-semibold w-24 whitespace-nowrap cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" @click="toggleSort('wordCount')">
                      字數
                      <span v-if="sortField === 'wordCount'" class="ml-1 text-xs">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                    </th>
                    <th class="px-6 py-3 font-semibold w-32 whitespace-nowrap">標籤</th>
                    <th class="px-6 py-3 font-semibold w-24 whitespace-nowrap">狀態</th>
                    <th class="px-6 py-3 font-semibold w-56 whitespace-nowrap cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" @click="toggleSort('lastModified')">
                      最後修改
                       <span v-if="sortField === 'lastModified'" class="ml-1 text-xs">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                    </th>
                    <th class="px-6 py-3 font-semibold w-20 text-right whitespace-nowrap sticky right-0 z-30 bg-slate-50 dark:bg-slate-800 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] dark:shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.5)]">操作</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr 
                    v-for="(note, index) in orderedNotes" 
                    :key="note.id" 
                    class="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    @click="openEditor(note)"
                  >
                    <!-- Title -->
                    <td class="px-6 py-4">
                      <NoteTooltip :content="note.content" :placement="index < 2 ? 'bottom' : 'top'">
                          <span class="font-bold text-slate-900 dark:text-slate-100 cursor-help border-b border-dotted border-slate-300 dark:border-slate-600">
                             {{ note.title }}
                          </span>
                      </NoteTooltip>
                    </td>
                    <!-- Word Count -->
                    <td class="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono text-xs">
                      {{ note.wordCount || 0 }}
                    </td>
                    <!-- Tag -->
                    <td class="px-6 py-4 whitespace-nowrap">
                       <span
                        class="inline-flex rounded-full border px-2 py-0.5 text-xs font-bold"
                        :class="TAG_STYLES[note.tag].badge"
                      >
                        {{ TAG_LABELS[note.tag] }}
                      </span>
                    </td>
                    <!-- Share Status -->
                    <td class="px-6 py-4">
                      <div v-if="note.shareEnabled && !note.shareExpiresAt" class="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <div class="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"></div>
                        <span class="text-xs font-medium">分享中</span>
                      </div>
                      <div v-else-if="note.shareEnabled && note.shareExpiresAt" class="flex items-center gap-1.5 text-orange-500 dark:text-orange-400">
                        <div class="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0"></div>
                        <span class="text-xs font-medium">分享至 {{ new Date(note.shareExpiresAt).toLocaleDateString('zh-TW') }}</span>
                      </div>
                      <div v-else class="flex items-center gap-1.5 text-slate-400">
                        <div class="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></div>
                        <span class="text-xs font-medium">私密</span>
                      </div>
                    </td>
                    <!-- Last Modified -->
                    <td class="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                      {{ note.lastModified }}
                    </td>
                    <!-- Actions -->
                    <td 
                      class="px-6 py-4 text-right sticky right-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-900 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] dark:shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.5)] z-30"
                    >
                      <div class="relative inline-block text-left">
                        <button
                          :ref="(el: any) => { if (el) menuBtnRefs[note.id] = el.$el || el }"
                          class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200/50 hover:text-slate-600 dark:hover:bg-slate-700/50 dark:hover:text-slate-200"
                          @click.stop="toggleMenu(note.id)"
                        >
                          <MoreHorizontal :size="16" />
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- Pagination Controls -->
          <div v-if="totalPages > 1" class="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-6 gap-4">
             <div class="text-xs text-slate-400 dark:text-slate-500">
               顯示 {{ (currentPage - 1) * 10 + 1 }} - {{ Math.min(currentPage * 10, totalItems) }} 筆，共 {{ totalItems }} 筆
             </div>
             
             <div class="flex items-center gap-1">
               <button 
                 class="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                 :disabled="currentPage <= 1 || isLoading"
                 @click="changePage(currentPage - 1)"
                 aria-label="Previous Page"
               >
                 <ChevronLeft :size="16" />
               </button>
               
               <template v-for="(p, index) in paginationRange" :key="index">
                   <span v-if="p === '...'" class="px-2 text-slate-400 text-xs">...</span>
                   <button 
                     v-else
                     class="min-w-[32px] h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors border"
                     :class="currentPage === p 
                        ? 'bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:border-slate-100 dark:text-slate-900' 
                        : 'bg-white border-transparent text-slate-500 hover:bg-slate-50 hover:border-slate-200 dark:bg-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:border-slate-700'"
                     @click="changePage(Number(p))"
                   >
                     {{ p }}
                   </button>
               </template>

               <button 
                 class="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                 :disabled="currentPage >= totalPages || isLoading"
                 @click="changePage(currentPage + 1)"
                 aria-label="Next Page"
               >
                 <ChevronRight :size="16" />
               </button>
             </div>
          </div>
        </div>

        <!-- Grid View -->
        <div v-else>
          <TransitionGroup
            tag="div"
            name="list"
            class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 mb-6"
          >
            <NoteCard
              v-for="note in orderedNotes"
              :key="note.id"
              :note="note"
              :is-list-view="false"
              :active-menu-id="activeMenuId"
              :is-busy="!!shareBusy[note.id]"
              :copied-id="copiedId"
              @open-editor="openEditor"
              @navigate-to-view="openViewer"
              @toggle-menu="toggleMenu"
              @toggle-share="handleToggleShare"
              @toggle-archive="handleToggleArchive"
              @delete-note="handleDeleteNote"
              @copy-share-link="copyShareLink"
              @open-share-preview="openSharePreview"
            />

            <button
              key="create-btn"
              class="flex flex-col items-center justify-center gap-2 rounded-2xl border border-indigo-100 dark:border-slate-700 bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
              @click="createNote"
            >
              <span
                class="flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
              >
                <Plus :size="20" />
              </span>
              <span class="text-base font-bold text-slate-900 dark:text-slate-200">建立新筆記</span>
              <span class="text-xs text-slate-500 dark:text-slate-400">開始記錄你的靈感</span>
            </button>
          </TransitionGroup>
          
           <!-- Infinite Scroll Sentinel -->
           <div 
             v-if="!isLoading && currentPage < totalPages" 
             ref="loadTrigger" 
             class="flex justify-center py-8"
           >
               <div v-if="isLoadingMoreDelay || isAppending" class="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
               <div v-else class="h-6 w-6 opacity-0"></div>
           </div>
           
           <div v-if="isLoading && !isAppending" class="flex justify-center py-8">
              <div class="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
           </div>
           
           <div v-if="!isLoading && currentPage >= totalPages && orderedNotes.length > 0" class="text-center py-8">
              <span class="text-xs text-slate-400 dark:text-slate-600">已顯示所有筆記</span>
           </div>
        </div>
      </div>
    </section>
  </div>

  <!-- 清單模式下拉選單 (Teleport 到 body 避免 overflow 裁切) -->
  <Teleport to="body">
    <template v-if="activeMenuId && isListView">
      <!-- Backdrop -->
      <div
        class="fixed inset-0 z-[100] cursor-pointer"
        @click.stop="closeMenu"
      ></div>
      <!-- 選單 -->
      <SharedNoteMenu
        v-if="orderedNotes.find(n => n.id === activeMenuId)"
        class="fixed z-[110] w-32 shadow-xl border border-slate-100 dark:border-slate-700 rounded-xl"
        :style="{ top: menuPosition.top + 'px', left: menuPosition.left + 'px' }"
        :note="orderedNotes.find(n => n.id === activeMenuId)!"
        :is-busy="!!shareBusy[activeMenuId!]"
        :copied-id="copiedId"
        @open-editor="openEditor"
        @toggle-share="handleToggleShare"
        @toggle-archive="handleToggleArchive"
        @copy-share-link="copyShareLink"
        @open-share-preview="openSharePreview"
        @delete-note="handleDeleteNote"
      />
    </template>
  </Teleport>
</template>

<style scoped>
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

.list-leave-active {
  position: absolute;
}
</style>
