<script setup lang="ts">
import { computed } from 'vue'
import {
  MoreHorizontal,
} from 'lucide-vue-next'
import SharedNoteMenu from './SharedNoteMenu.vue'
import type { Note } from '../types/Note'
import { TAG_LABELS, TAG_STYLES } from '../types/Note'
import { stripMarkdownForPreview } from '../utils/stripMarkdown'

const props = defineProps<{
  note: Note
  isListView: boolean
  activeMenuId: string | null
  isBusy: boolean
  copiedId: string | null
}>()

const emit = defineEmits<{
  (e: 'toggle-menu', id: string): void
  (e: 'open-editor', note: Note): void
  (e: 'navigate-to-view', note: Note): void
  (e: 'toggle-share', note: Note): void
  (e: 'delete-note', note: Note): void

  (e: 'copy-share-link', note: Note): void
  (e: 'open-share-preview', note: Note): void
  (e: 'toggle-archive', note: Note): void
}>()



const getShareMeta = (note: Note) => {
  if (!note.shareEnabled) return ''
  if (!note.shareExpiresAt) return '分享中（永久）'
  const expires = new Date(note.shareExpiresAt)
  if (Number.isNaN(expires.getTime())) return '分享中'
  if (expires <= new Date()) return '分享已過期'
  return `分享至 ${expires.toLocaleDateString('zh-TW')}`
}

// 過濾後的預覽內容（移除 markdown、HTML 標籤、圖片語法、script 等）
const previewContent = computed(() => stripMarkdownForPreview(props.note.content))

const cardClasses = computed(() => {
  const base =
    'group rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg'
  if (props.isListView) {
    return `${base} p-4 md:p-5 flex flex-col md:flex-row md:items-start gap-4`
  }
  if (props.note.featured) {
    return `${base} md:col-span-2 xl:col-span-2 ${
      props.note.cover ? 'overflow-hidden' : 'p-5'
    } flex flex-col md:flex-row`
  }
  if (props.note.cover) {
    return `${base} overflow-hidden flex flex-col h-full`
  }
  return `${base} p-5 flex flex-col h-full`
})
</script>

<template>
  <article
    :class="cardClasses"
    class="bg-white dark:bg-slate-900"
  >
    <div
      v-if="note.cover && !isListView"
      class="relative w-full overflow-hidden"
      :class="note.featured ? 'h-40 md:h-auto md:w-5/12' : 'h-32'"
    >
      <div
        class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
        :style="{ backgroundImage: `url(${note.cover})` }"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
      <div class="absolute left-4 top-4 flex items-center gap-2">
        <span
          v-if="note.featured"
          class="rounded-full border border-white/20 bg-white/15 px-2 py-1 text-xs font-bold text-white backdrop-blur"
        >
          Featured
        </span>

      </div>
    </div>

    <div
      v-else-if="note.cover && isListView"
      class="relative h-28 w-full overflow-hidden rounded-xl md:h-24 md:w-32"
    >
      <div class="absolute inset-0 bg-cover bg-center" :style="{ backgroundImage: `url(${note.cover})` }" />
    </div>

    <div class="flex flex-1 flex-col w-full" :class="note.cover && !isListView ? 'p-5' : ''">
      <div class="flex items-start justify-between gap-2">
        <div class="flex flex-wrap gap-2">
          <span
            class="rounded-full border px-2 py-1 text-xs font-bold"
            :class="TAG_STYLES[note.tag].badge"
          >
            #{{ TAG_LABELS[note.tag] }}
          </span>
          <span
            v-for="badge in note.badges"
            :key="badge"
            class="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400"
          >
            {{ badge }}
          </span>
        </div>
        <div class="relative flex items-center gap-2 text-slate-400">
            <button
              class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              @click.stop="emit('toggle-menu', note.id)"
            >
              <MoreHorizontal :size="18" />
            </button>

            <div
              v-if="activeMenuId === note.id"
              class="fixed inset-0 z-10 cursor-pointer"
              @click.stop="emit('toggle-menu', '')"
            ></div>
            <SharedNoteMenu
              v-if="activeMenuId === note.id"
              class="absolute right-0 top-9 z-20 w-32 origin-top-right rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl"
              :note="note"
              :is-busy="isBusy"
              :copied-id="copiedId"
              @open-editor="emit('open-editor', note)"
              @toggle-share="emit('toggle-share', note)"
              @copy-share-link="emit('copy-share-link', note)"
              @open-share-preview="emit('open-share-preview', note)"
              @toggle-archive="emit('toggle-archive', note)"
              @delete-note="emit('delete-note', note)"
            />
        </div>
      </div>

      <div class="my-3 space-y-2">
        <div class="flex items-center gap-2">
          <h3 
            class="text-lg font-bold text-slate-900 dark:text-slate-100 transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
            @click.stop="emit('open-editor', note)"
          >
            {{ note.title }}
          </h3>
        </div>

        <div v-if="note.listItems && !isListView" class="text-sm text-slate-600 dark:text-slate-400">
          <ul class="list-disc space-y-1 pl-4">
            <li v-for="item in note.listItems" :key="item">{{ item }}</li>
          </ul>
        </div>
        <p
          v-else
          class="text-sm leading-relaxed text-slate-600 dark:text-slate-400"
          :class="[
            isListView ? 'line-clamp-2' : 'line-clamp-4',
            note.monospace ? 'rounded-lg bg-slate-50 dark:bg-slate-800 p-2 font-mono text-xs' : '',
          ]"
        >
          {{ previewContent }}
        </p>
      </div>

      <div
        class="mt-auto flex w-full flex-col gap-3 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs text-slate-400"
      >
        <div class="flex items-end justify-between gap-3">
          <div v-if="note.collaborators?.length" class="flex -space-x-2">
            <span
              v-for="person in note.collaborators"
              :key="person.name"
              class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white"
              :class="person.color"
            >
              {{ person.initials }}
            </span>
          </div>
          <div v-else></div>
          
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 font-semibold">
            <!-- Shared (Permanent) -->
            <div v-if="note.shareEnabled && !note.shareExpiresAt" class="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                 <div class="h-2 w-2 rounded-full bg-emerald-500"></div>
                 <span>分享中</span>
            </div>
            <!-- Shared (Limited) -->
            <div v-else-if="note.shareEnabled && note.shareExpiresAt" class="flex items-center gap-1.5 text-orange-500 dark:text-orange-400">
                 <div class="h-2 w-2 rounded-full bg-orange-500"></div>
                 <span>{{ getShareMeta(note) }}</span>
            </div>
            <!-- Private -->
            <div v-else class="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                 <div class="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                 <span>私密</span>
            </div>
          </div>
          <div class="text-slate-400 dark:text-slate-500">字數: {{ note.wordCount || 0 }}</div>
        </div>
        <div class="flex flex-col gap-1 ml-auto text-right">
              <span class="text-slate-400 dark:text-slate-500">最後修改 {{ note.lastModified }}</span>
          </div>
      </div>


    </div>
  </article>
</template>


