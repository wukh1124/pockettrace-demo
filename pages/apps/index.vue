<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, Edit2, Trash2, ExternalLink, Box, GripHorizontal, AppWindow } from 'lucide-vue-next'
import { useApps, type AppItem } from '~/composables/useApps'

const { apps, fetchApps, createApp, updateApp, deleteApp, loading } = useApps()

await useAsyncData('apps-data', async () => {
  await fetchApps()
  return true
})

const showAppModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const currentApp = ref<Partial<AppItem>>({
  name: '',
  url: '',
  icon: ''
})

const openCreateModal = () => {
  modalMode.value = 'create'
  currentApp.value = { name: '', url: '', icon: '' }
  showAppModal.value = true
}

const openEditModal = (app: AppItem) => {
  modalMode.value = 'edit'
  currentApp.value = { ...app }
  showAppModal.value = true
}

const handleSaveApp = async () => {
  if (!currentApp.value.name || !currentApp.value.url) return

  if (modalMode.value === 'create') {
    await createApp({
      name: currentApp.value.name,
      url: currentApp.value.url,
      icon: currentApp.value.icon,
      orderIndex: apps.value.length
    })
  } else if (modalMode.value === 'edit' && currentApp.value.id) {
    await updateApp(currentApp.value.id, {
      name: currentApp.value.name,
      url: currentApp.value.url,
      icon: currentApp.value.icon
    })
  }

  showAppModal.value = false
}

const handleDeleteApp = async (id: string) => {
  if (confirm('確定要刪除這個應用程式嗎？')) {
    await deleteApp(id)
  }
}

const openAppUrl = (url: string) => {
  const finalUrl = url.startsWith('http') ? url : `https://${url}`
  window.open(finalUrl, '_blank')
}
</script>

<template>
  <div class="space-y-6 max-w-5xl mx-auto pb-20">
    <!-- Header -->
    <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div class="space-y-1">
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white">應用啟動器</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">管理你常用的 Web 應用與書籤</p>
      </div>

      <div class="flex gap-2 w-full md:w-auto">
        <button 
          @click="openCreateModal"
          class="flex-1 md:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white px-4 py-2.5 text-sm font-semibold hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all active:scale-95 shadow-sm"
        >
          <Plus class="w-4 h-4" />
          新增應用
        </button>
      </div>
    </div>

    <!-- Content Status -->
    <div v-if="loading && apps.length === 0" class="py-20 text-center">
      <div class="inline-block animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600 h-8 w-8 mb-4"></div>
      <p class="text-slate-500">載入應用中...</p>
    </div>

    <div v-else-if="apps.length === 0" class="py-20 text-center px-4">
      <div class="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <Box class="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
      </div>
      <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">尚無應用程式</h3>
      <p class="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
        點擊上方按鈕，將你常用的 Web 服務或網站加到啟動器中。
      </p>
    </div>

    <!-- Grid -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      <div
        v-for="app in apps"
        :key="app.id"
        class="group relative flex flex-col items-center p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:shadow-lg dark:hover:border-slate-600 transition-all active:scale-95 cursor-pointer"
        @click="openAppUrl(app.url)"
      >
        <div class="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3 overflow-hidden">
          <img v-if="app.icon" :src="app.icon" :alt="app.name" class="w-full h-full object-cover rounded-2xl" @error="(e) => { (e.target as HTMLImageElement).style.display = 'none' }" />
          <AppWindow v-else class="w-6 h-6 text-slate-400 dark:text-slate-500" />
        </div>
        <span class="text-sm font-medium text-slate-700 dark:text-slate-300 text-center line-clamp-1 w-full">{{ app.name }}</span>
        
        <!-- Actions (Edit/Delete) on Hover -->
        <div class="absolute -top-2 -right-2 hidden group-hover:flex gap-1 bg-white dark:bg-slate-700 rounded-full shadow-md p-1 border border-slate-200 dark:border-slate-600">
          <button 
            @click.stop="openEditModal(app)"
            class="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
          >
            <Edit2 class="w-3.5 h-3.5" />
          </button>
          <button 
            @click.stop="handleDeleteApp(app.id)"
            class="p-1.5 text-slate-500 hover:text-red-500 dark:hover:text-red-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- App Modal -->
    <div v-if="showAppModal" class="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm" @click.self="showAppModal = false">
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div class="p-6">
          <h3 class="text-lg font-bold tracking-tight text-slate-900 dark:text-white mb-6">
            {{ modalMode === 'create' ? '新增應用' : '編輯應用' }}
          </h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">應用名稱 *</label>
              <input 
                v-model="currentApp.name" 
                type="text" 
                placeholder="例如: GitHub" 
                class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">網址 URL *</label>
              <input 
                v-model="currentApp.url" 
                type="url" 
                placeholder="https://github.com" 
                class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">圖標網址 (選填)</label>
              <input 
                v-model="currentApp.icon" 
                type="url" 
                placeholder="https://example.com/icon.png" 
                class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
              />
              <p class="text-xs text-slate-500 mt-1">留白將顯示預設圖標</p>
            </div>
          </div>
          
          <div class="mt-8 flex justify-end gap-3">
            <button 
              @click="showAppModal = false"
              class="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              取消
            </button>
            <button 
              @click="handleSaveApp"
              :disabled="!currentApp.name || !currentApp.url"
              class="px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              儲存
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
