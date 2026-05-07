<script setup lang="ts">
import {
  Pencil,
  Share2,
  Trash2,
  Link as LinkIcon,
  Eye,
  Check,
  Archive,
} from 'lucide-vue-next'
import type { Note } from '../types/Note'

defineProps<{
  note: Note
  isBusy?: boolean
  copiedId?: string | null
}>()

const emit = defineEmits<{
  (e: 'open-editor', note: Note): void
  (e: 'toggle-share', note: Note): void
  (e: 'copy-share-link', note: Note): void
  (e: 'open-share-preview', note: Note): void
  (e: 'toggle-archive', note: Note): void
  (e: 'delete-note', note: Note): void
}>()
</script>

<template>
  <div class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 shadow-xl focus:outline-none flex flex-col gap-0.5">
    <button
      class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
      @click.stop="emit('open-editor', note)"
    >
      <Pencil :size="14" />
      編輯
    </button>
    <button
      class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
      :disabled="isBusy"
      @click.stop="emit('toggle-share', note)"
    >
      <Share2 :size="14" />
      {{ note.shareEnabled ? '停用分享' : '分享' }}
    </button>
    <button
        class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
        @click.stop="emit('open-share-preview', note)"
    >
        <Eye :size="14" />
         瀏覽
    </button>
    <button
      class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
      @click.stop="emit('copy-share-link', note)"
    >
      <component :is="copiedId === note.id ? Check : LinkIcon" :size="14" />
      {{ copiedId === note.id ? '已複製' : '複製連結' }}
    </button>
    <div class="my-1 h-px bg-slate-100 dark:bg-slate-800"></div>
    <button
      class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
      :disabled="isBusy"
      @click.stop="emit('toggle-archive', note)"
    >
      <Archive :size="14" />
      {{ note.isArchived ? '取消封存' : '封存' }}
    </button>
    <button
      class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600"
      @click.stop="emit('delete-note', note)"
    >
      <Trash2 :size="14" />
      刪除
    </button>
  </div>
</template>
