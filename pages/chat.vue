<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { Plus, Trash2, Send, MessageSquare, Menu, Pencil, Check, X, Copy, MoreHorizontal, Settings, RotateCw, Image, Trash } from 'lucide-vue-next'
import { useAuth } from '../composables/useAuth'
import { useConfirm } from '../composables/useConfirm'
import { useDemo } from '../composables/useDemo'

definePageMeta({
  // 已由 auth.global.ts 處理權限控管
})

const { user } = useAuth()
const { confirm } = useConfirm()
const { isDemoMode } = useDemo()
// AI 配置（從後端 API 動態載入）
const aiConfig = ref<any>({ currentProvider: '', aiModels: [], modelUsage: {} })
const aiModels = ref<Array<{id: string, name: string}>>([])
const currentProvider = ref('')

// 載入 AI 配置
async function loadAIConfig() {
  try {
    const res = await $fetch<any>('/api/ai/config')
    if (res) {
      aiConfig.value = res
      aiModels.value = res.aiModels || []
      currentProvider.value = res.currentProvider
      
      // 如果聊天設定中沒有選擇模型，設定預設值
      if (aiModels.value.length > 0) {
        // 優先使用已儲存的設定
        if (chatSettings.value.selectedModel && aiModels.value.some(m => m.id === chatSettings.value.selectedModel)) {
          selectedModel.value = chatSettings.value.selectedModel
        } else {
          // 否則使用第一個可用模型
          chatSettings.value.selectedModel = aiModels.value[0].id
          selectedModel.value = aiModels.value[0].id
        }
      }
    }
  } catch(e) { 
    console.error('Failed to load AI config', e) 
  }
}

const sessions = ref<any[]>([])
const activeSessionId = ref<string | null>(null)
const messages = ref<any[]>([])
const newMessageInput = ref('')
const selectedModel = ref('')
const isSidebarOpen = ref(false)
const isMobile = ref(false)

// Chat Settings
const isSettingsOpen = ref(false)
const isSettingsSaving = ref(false)
const chatSettings = ref({
  selectedModel: '',
  chatTone: 'normal'
})

const toneOptions = [
  { value: 'normal', label: '一般對話 (預設)' },
  { value: 'professional', label: '專業嚴肅' },
  { value: 'concise', label: '精簡回覆' },
  { value: 'lively', label: '活潑有趣' }
]

// Message editing state
const editingMessageId = ref<string | null>(null)
const editingMessageContent = ref('')
const messageEditInput = ref<HTMLTextAreaElement | null>(null)
const copiedId = ref<string | null>(null)

// Image upload state
const selectedImages = ref<string[]>([])
const fileInput = ref<HTMLInputElement | null>(null)

onMounted(() => {
  loadSessions()
  isMobile.value = window.innerWidth < 768
  isSidebarOpen.value = !isMobile.value
  
  window.addEventListener('resize', () => {
    isMobile.value = window.innerWidth < 768
  })
  
  loadSettings()
  loadAIConfig()
})

// API Calls
async function loadSettings() {
  try {
    const res = await $fetch<any>('/api/chat/settings')
    if (res) {
      chatSettings.value.chatTone = res.chatTone || 'normal'
      if (res.model) {
        chatSettings.value.selectedModel = res.model
      }
    }
  } catch(e) { console.error('Failed to load settings', e) }
}

async function saveSettings() {
  isSettingsSaving.value = true
  try {
    await $fetch('/api/chat/settings', {
      method: 'POST',
      body: {
        model: chatSettings.value.selectedModel,
        chatTone: chatSettings.value.chatTone
      }
    })
    // 同步更新前端選擇的模型
    if (chatSettings.value.selectedModel) {
      selectedModel.value = chatSettings.value.selectedModel
    }
    isSettingsOpen.value = false
  } catch(e) { 
    console.error('Failed to save settings', e) 
  } finally {
    isSettingsSaving.value = false
  }
}

async function loadSessions() {
  try {
    const res = await $fetch<any[]>('/api/chat/sessions')
    sessions.value = res
  } catch(e) { console.error('Failed to load sessions', e) }
}

async function startNewSession() {
  activeSessionId.value = 'new'
  messages.value = []
  if (window.innerWidth < 768) {
    isSidebarOpen.value = false
  }
}

async function actuallyCreateSession() {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const timeStr = new Intl.DateTimeFormat('zh-TW', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(now).replace('AM', '上午').replace('PM', '下午')
  
  const defaultTitle = `新對話 @${month}月${day}日 ${timeStr}`

  try {
    const res = await $fetch<any>('/api/chat/sessions', {
      method: 'POST',
      body: { title: defaultTitle, model: selectedModel.value }
    })
    sessions.value.unshift(res)
    activeSessionId.value = res.id
    return res
  } catch(e) { 
    console.error('Failed to create session', e)
    return null
  }
}

async function deleteSession(id: string) {
  if (!await confirm('確定要刪除這對話嗎？此操作無法復原。')) return
  try {
    await $fetch(`/api/chat/sessions/${id}`, { method: 'DELETE' })
    sessions.value = sessions.value.filter(s => s.id !== id)
    if (activeSessionId.value === id) {
      activeSessionId.value = null
      messages.value = []
    }
  } catch(e) { console.error('Failed to delete session', e) }
}

async function selectSession(id: string) {
  isEditingTitle.value = false
  activeSessionId.value = id
  if (window.innerWidth < 768) {
    isSidebarOpen.value = false
  }
  try {
    const res = await $fetch<any[]>(`/api/chat/messages?sessionId=${id}`)
    messages.value = res
    
    // Sync current session's model to selectedModel and settings
    const session = sessions.value.find(s => s.id === id)
    if (session && session.model) {
      selectedModel.value = session.model
      chatSettings.value.selectedModel = session.model
    }
    
    scrollToBottom()
  } catch(e) { console.error('Failed to load messages', e) }
}

// Watch for model changes to update current session
watch(selectedModel, async (newModel) => {
  if (!newModel) return // 模型尚未載入時不處理
  if (activeSessionId.value && activeSessionId.value !== 'new') {
    const session = sessions.value.find(s => s.id === activeSessionId.value)
    if (session && session.model !== newModel) {
      try {
        await $fetch(`/api/chat/sessions/${activeSessionId.value}`, {
          method: 'PATCH',
          body: { model: newModel }
        })
        session.model = newModel
      } catch (e) {
        console.error('Failed to update session model', e)
      }
    }
  }
})

async function deleteMessage(id: string) {
  if (!await confirm('確定要刪除這條訊息嗎？此操作無法復原。')) return
  try {
    await $fetch(`/api/chat/messages/${id}`, { method: 'DELETE' })
    messages.value = messages.value.filter(m => m.id !== id)
  } catch(e) { console.error('Failed to delete message', e) }
}

async function rewriteMessage(aiMsgId: string) {
  if (!await confirm({
    title: '重新生成回覆',
    message: '重新生成將會刪除此回覆，並嘗試再次取得 AI 的回應。確定嗎？',
    confirmText: '確定重寫',
    cancelText: '取消'
  })) return

  // Find the message index
  const msgIndex = messages.value.findIndex(m => m.id === aiMsgId)
  if (msgIndex === -1) return

  // Find the previous user message
  let lastUserMsg = null
  for (let i = msgIndex - 1; i >= 0; i--) {
    if (messages.value[i].role === 'user') {
      lastUserMsg = messages.value[i]
      break
    }
  }

  if (!lastUserMsg) return

  try {
    // Delete the AI message
    await $fetch(`/api/chat/messages/${aiMsgId}`, { method: 'DELETE' })
    messages.value = messages.value.filter(m => m.id !== aiMsgId)
    
    // Resend the user message (triggering new AI response)
    // We send empty override because we want it to use the LAST user content
    await sendMessage(lastUserMsg.content, lastUserMsg.images)
  } catch(e) { console.error('Failed to rewrite message', e) }
}

function startEditingMessage(msg: any) {
  editingMessageId.value = msg.id
  editingMessageContent.value = msg.content
  nextTick(() => {
    messageEditInput.value?.focus()
  })
}

async function saveMessageEdit(id: string) {
  if (!editingMessageContent.value.trim()) return
  try {
    await $fetch(`/api/chat/messages/${id}`, {
      method: 'PATCH',
      body: { content: editingMessageContent.value.trim() }
    })
    const msg = messages.value.find(m => m.id === id)
    if (msg) msg.content = editingMessageContent.value.trim()
    editingMessageId.value = null
  } catch(e) { console.error('Failed to update message', e) }
}

async function copyToClipboard(text: string, msgId: string) {
  try {
    // 優先使用 navigator.clipboard
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
    } else {
      // iOS 舊版相容性備案
      const textArea = document.createElement("textarea")
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
    
    copiedId.value = msgId
    setTimeout(() => {
      copiedId.value = null
    }, 2000)
  } catch (err) {
    console.error('Failed to copy text: ', err)
  }
}

const chatContainer = ref<HTMLElement | null>(null)
function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

// Helper functions for date/time formatting
function formatTime(dateStr: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('zh-TW', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date).replace('AM', '上午').replace('PM', '下午')
}

function formatDateHeader(dateStr: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  }).format(date)
}

function shouldShowDateDivider(messages: any[], index: number) {
  if (index === 0) return true
  const currentDate = new Date(messages[index].createdAt).toDateString()
  const prevDate = new Date(messages[index - 1].createdAt).toDateString()
  return currentDate !== prevDate
}

const isLoading = ref(false)
const showContinueBtn = ref(false)
const isWaitingForResponse = ref(false)

async function sendMessage(overrideContent?: string, overrideImages?: string[]) {
  const content = overrideContent || newMessageInput.value
  const images = overrideImages || selectedImages.value
  
  if (!content.trim() && (!images || images.length === 0)) return
  if (isLoading.value) return
  
  isLoading.value = true
  showContinueBtn.value = false
  if (!overrideContent) {
    newMessageInput.value = ''
    selectedImages.value = []
  }
  
  // 如果是尚未選擇對話或處於「新對話」狀態，現在才真正建立
  if (!activeSessionId.value || activeSessionId.value === 'new') {
    const newSession = await actuallyCreateSession()
    if (!newSession) {
      isLoading.value = false
      return
    }
  }
  
  const sessionId = activeSessionId.value
  
  // Optimistic UI update for user message
  if (!overrideContent) {
    messages.value.push({ 
      role: 'user', 
      content, 
      images: images.length > 0 ? [...images] : null,
      id: Date.now().toString(), 
      model: selectedModel.value, 
      createdAt: new Date().toISOString() 
    })
  }
  
  // Note: We no longer pre-push an empty AI message here to avoid the "empty bubble" issue.
  // Instead, we show an 'isWaitingForResponse' indicator and push the AI message on the first chunk.
  const aiMsgId = 'ai-' + Date.now()
  isWaitingForResponse.value = true
  scrollToBottom()
  
  try {
    const response = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, content, images })
    })

    if (!response.ok) {
       const errData = await response.json().catch(() => ({}))
       throw { data: errData, statusMessage: response.statusText }
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let done = false
    let fullContent = ''
    let aiMessageCreated = false

    if (reader) {
      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        const chunkValue = decoder.decode(value)
        if (!chunkValue && done) break;
        fullContent += chunkValue
        
        if (!aiMessageCreated && fullContent.trim()) {
          isWaitingForResponse.value = false
          messages.value.push({
            role: 'ai',
            content: fullContent,
            id: aiMsgId,
            model: selectedModel.value,
            createdAt: new Date().toISOString()
          })
          aiMessageCreated = true
        } else if (aiMessageCreated) {
          const msgIndex = messages.value.findIndex(m => m.id === aiMsgId)
          if (msgIndex !== -1) {
            messages.value[msgIndex].content = fullContent
          }
        }
        scrollToBottom()
      }
    }

    // --- 自動重新命名邏輯 ---
    // 如果目前訊息數量正好是 2 (一問一答)，且這是在剛剛建立的新對話中
    if (messages.value.length === 2 && messages.value[0].role === 'user' && messages.value[1].role === 'ai') {
      try {
        const res = await $fetch<{ title: string }>('/api/chat/sessions/summarize', {
          method: 'POST',
          body: { sessionId }
        })
        if (res && res.title) {
          const session = sessions.value.find(s => s.id === sessionId)
          if (session) session.title = res.title
        }
      } catch (e) {
        console.error('Failed to auto-rename session', e)
      }
    }
    // -----------------------

    // 判斷是否顯示「繼續回答」按鈕 (啟發式：如果長度長且不以標點結尾)
    if (fullContent.length > 500 && !/[。！？.!?]$/.test(fullContent.trim())) {
      showContinueBtn.value = true
    }

  } catch(e: any) { 
    console.error('Failed to send message', e)
    isWaitingForResponse.value = false
    const errorMsg = e.data?.message || e.statusMessage || '連線伺服器時發生未知錯誤';
    
    // 將最後一條 AI 訊息更新為錯誤（如果已建立），否則新增一條
    const msgIndex = messages.value.findIndex(m => m.id === aiMsgId)
    if (msgIndex !== -1) {
      messages.value[msgIndex].content = `⚠️ ${errorMsg}`
      messages.value[msgIndex].model = 'system'
    } else {
      messages.value.push({
        role: 'ai',
        content: `⚠️ ${errorMsg}`,
        id: aiMsgId,
        model: 'system',
        createdAt: new Date().toISOString()
      })
    }
    scrollToBottom()
  } finally {
    isLoading.value = false
    isWaitingForResponse.value = false
  }
}

async function continueChat() {
  await sendMessage('請繼續回答上方未完成的內容。')
}

const isEditingTitle = ref(false)
const editingTitleValue = ref('')
const titleInput = ref<HTMLInputElement | null>(null)

function startEditingTitle() {
  if (!activeSessionId.value || activeSessionId.value === 'new') return
  const currentSession = sessions.value.find(s => s.id === activeSessionId.value)
  if (currentSession) {
    editingTitleValue.value = currentSession.title
    isEditingTitle.value = true
    nextTick(() => {
      titleInput.value?.focus()
    })
  }
}

async function saveTitle() {
  if (!activeSessionId.value || activeSessionId.value === 'new' || !editingTitleValue.value.trim()) {
    isEditingTitle.value = false
    return
  }
  
  const oldTitle = sessions.value.find(s => s.id === activeSessionId.value)?.title
  if (oldTitle === editingTitleValue.value.trim()) {
    isEditingTitle.value = false
    return
  }

  try {
    await $fetch(`/api/chat/sessions/${activeSessionId.value}`, {
      method: 'PATCH',
      body: { title: editingTitleValue.value.trim() }
    })
    
    // Update local state
    const session = sessions.value.find(s => s.id === activeSessionId.value)
    if (session) {
      session.title = editingTitleValue.value.trim()
    }
    isEditingTitle.value = false
  } catch(e) {
    console.error('Failed to update session title', e)
  }
}

function cancelEditingTitle() {
  isEditingTitle.value = false
}

function openChatSettings() {
  isSettingsOpen.value = true
}

function triggerFileUpload() {
  fileInput.value?.click()
}

async function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  if (!target.files?.length) return

  for (const file of Array.from(target.files)) {
    if (!file.type.startsWith('image/')) continue
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      if (base64 && !selectedImages.value.includes(base64)) {
        selectedImages.value.push(base64)
      }
    }
    reader.readAsDataURL(file)
  }
  
  // Reset input
  target.value = ''
}

function removeSelectedImage(index: number) {
  selectedImages.value.splice(index, 1)
}

function openImage(url: string) {
  window.open(url, '_blank')
}

</script>

<template>
  <div class="h-[calc(100dvh-60px)] md:h-[85vh] flex overflow-hidden bg-white dark:bg-slate-900 rounded-none md:rounded-2xl border-0 md:border border-gray-200 dark:border-slate-800 shadow-none md:shadow-[0_4px_24px_rgba(0,0,0,0.02)] relative chat-mobile-full">
    
    <aside 
      class="absolute md:relative z-20 h-full bg-gray-50/90 dark:bg-slate-950/90 backdrop-blur-md border-r border-gray-200 dark:border-slate-800 flex flex-col transition-all duration-300 ease-in-out"
      :class="isSidebarOpen ? 'translate-x-0 w-64 opacity-100' : '-translate-x-full md:w-0 opacity-0 pointer-events-none overflow-hidden'"
    >
      <div class="p-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between min-w-[256px]">
        <h2 class="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 text-sm">
          <MessageSquare :size="18" class="text-indigo-600 dark:text-indigo-400" />
          AI 聊天對話
        </h2>
        <button @click="isSidebarOpen = false" class="md:hidden text-gray-400 hover:text-gray-600 p-1">
          <Menu :size="18"/>
        </button>
      </div>

      <div class="p-3 border-b border-gray-200 dark:border-slate-800 min-w-[256px]">
        <button 
          @click="startNewSession"
          class="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl transition-colors shadow-sm text-sm font-medium"
        >
          <Plus :size="16" /> 開始新對話
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-2 space-y-1 min-w-[256px]">
        <div 
          v-for="session in sessions" :key="session.id"
          class="group flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all duration-200"
          :class="activeSessionId === session.id ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'hover:bg-gray-200/50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300'"
          @click="selectSession(session.id)"
        >
          <div class="truncate text-sm font-medium flex-1">
            {{ session.title }}
          </div>
          <button @click.stop="deleteSession(session.id)" class="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md p-1.5 transition-all">
            <Trash2 :size="14" />
          </button>
        </div>
      </div>

      <div class="p-3 border-t border-gray-200 dark:border-slate-800 min-w-[256px]">
        <button @click="openChatSettings" class="w-full flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 p-2.5 rounded-xl transition-colors text-sm font-medium">
          <Settings :size="16" /> 聊天設定
        </button>
      </div>
    </aside>

    <!-- Overlay for mobile when sidebar is open -->
    <div 
      v-if="isSidebarOpen" 
      class="absolute inset-0 bg-black/20 z-10 md:hidden backdrop-blur-sm"
      @click="isSidebarOpen = false"
    ></div>

    <!-- Main Chat Area -->
    <main class="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 w-full relative z-0">
      
      <!-- Header -->
      <header class="h-[calc(60px+env(safe-area-inset-top,0px))] border-b border-gray-100 dark:border-slate-800 flex items-center px-4 gap-3 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 chat-header-safe">
        <button @click="isSidebarOpen = !isSidebarOpen" class="text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors">
          <Menu :size="20" />
        </button>
        <div v-if="activeSessionId" class="flex items-center gap-2 overflow-hidden flex-1">
          <template v-if="activeSessionId === 'new'">
            <h3 class="font-semibold text-gray-800 dark:text-gray-200 truncate">
              開始新對話
            </h3>
          </template>
          <template v-else-if="!isEditingTitle">
            <h3 class="font-semibold text-gray-800 dark:text-gray-200 truncate">
              {{ sessions.find(s => s.id === activeSessionId)?.title || '聊天' }}
            </h3>
            <button 
              @click="startEditingTitle" 
              class="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded-md transition-colors flex-shrink-0"
              title="編輯標題"
            >
              <Pencil :size="14" />
            </button>
          </template>
          <template v-else>
            <div class="flex items-center gap-1 w-full max-w-sm">
              <input 
                ref="titleInput"
                v-model="editingTitleValue" 
                @keydown.enter="saveTitle"
                @keydown.esc="cancelEditingTitle"
                class="flex-1 bg-gray-50 dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-lg px-2 py-1 text-sm outline-none text-gray-800 dark:text-gray-200"
              />
              <button @click="saveTitle" class="text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 p-1 rounded-md">
                <Check :size="16" />
              </button>
              <button @click="cancelEditingTitle" class="text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 p-1 rounded-md">
                <X :size="16" />
              </button>
            </div>
          </template>
        </div>
        <span v-if="activeSessionId" class="text-[10px] sm:text-xs px-2 py-1 sm:px-2.5 sm:py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg ml-auto whitespace-nowrap">
          {{ activeSessionId === 'new' ? aiModels.find(m => m.id === selectedModel)?.name : (aiModels.find(m => m.id === sessions.find(s => s.id === activeSessionId)?.model)?.name || sessions.find(s => s.id === activeSessionId)?.model || 'AI 模型') }}
        </span>
      </header>

      <!-- Messages list -->
      <div 
        ref="chatContainer"
        class="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth"
      >
        <template v-if="activeSessionId">
          <div v-if="messages.length === 0 || activeSessionId === 'new'" class="h-full flex flex-col items-center justify-center text-gray-400 gap-4 opacity-50">
            <div class="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
              <MessageSquare :size="32" />
            </div>
            <p class="text-sm">開始一個新的對話吧！</p>
          </div>
          
          <div 
            v-for="(msg, index) in messages" :key="msg.id"
            class="flex flex-col gap-4"
          >
            <!-- Date Divider -->
            <div v-if="shouldShowDateDivider(messages, index)" class="flex justify-center my-4">
              <span class="px-3 py-1 bg-gray-100 dark:bg-slate-800 text-[11px] text-gray-400 dark:text-gray-500 rounded-full font-medium">
                {{ formatDateHeader(msg.createdAt) }}
              </span>
            </div>

            <div 
              class="flex items-end gap-2"
              :class="msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'"
            >
              <!-- Avatar placeholder -->
              <div 
                class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold shadow-sm"
                :class="msg.role === 'user' ? 'bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-gray-300' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300'"
              >
                {{ msg.role === 'user' ? 'U' : 'AI' }}
              </div>
            
              <div 
                class="max-w-[85%] sm:max-w-[75%] flex flex-col gap-1"
                :class="msg.role === 'user' ? 'items-end' : 'items-start'"
              >
                <div 
                  v-if="editingMessageId !== msg.id"
                  class="group relative rounded-2xl px-3.5 py-2 text-sm shadow-sm leading-relaxed transition-all"
                  :class="msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-sm' 
                    : 'bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-800 dark:text-gray-200 rounded-bl-sm'"
                >
                  <!-- Multi-modal Images -->
                  <div v-if="msg.images && msg.images.length > 0" class="flex flex-wrap gap-2 mb-2">
                    <img 
                      v-for="(img, imgIdx) in msg.images" 
                      :key="imgIdx" 
                      :src="img" 
                      class="max-w-[200px] max-h-[200px] rounded-lg border border-white/20 shadow-sm object-cover cursor-zoom-in"
                      @click="openImage(img)"
                    />
                  </div>
                    <div 
                      class="markdown-content" 
                      v-html="renderMarkdown(msg.content)"
                    ></div>
                  </div>
  
                <!-- Edit user message input -->
                <div v-else class="w-full min-w-[200px] flex flex-col gap-2">
                  <textarea 
                    ref="messageEditInput"
                    v-model="editingMessageContent"
                    class="w-full bg-white dark:bg-slate-800 border-2 border-indigo-500 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none resize-none min-h-[80px]"
                  ></textarea>
                  <div class="flex justify-end gap-2">
                    <button @click="editingMessageId = null" class="px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">取消</button>
                    <button @click="saveMessageEdit(msg.id)" class="px-3 py-1 text-xs bg-indigo-600 text-white rounded-lg">儲存</button>
                  </div>
                </div>
                
                <!-- Bottom bar (Unified for both AI and User) -->
                <div 
                  class="flex items-center gap-3 px-1 text-[10px] text-gray-400 font-medium w-full"
                  :class="msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'"
                >
                  <!-- Timestamp -->
                  <span class="opacity-60">{{ formatTime(msg.createdAt) }}</span>

                  <template v-if="msg.role === 'ai'">
                    <span class="flex items-center gap-1 uppercase tracking-wider opacity-60">
                      {{ msg.model || '未知模型' }}
                    </span>
                    <button @click="copyToClipboard(msg.content, msg.id)" class="transition-colors flex items-center gap-1 py-1 px-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800" :class="copiedId === msg.id ? 'text-green-500' : 'hover:text-indigo-500'">
                      <template v-if="copiedId === msg.id">
                        <Check :size="12" /> 已複製
                      </template>
                      <template v-else>
                        <Copy :size="12" /> 複製
                      </template>
                    </button>
                    <button @click="rewriteMessage(msg.id)" class="hover:text-indigo-500 transition-colors flex items-center gap-1 py-1 px-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 whitespace-nowrap">
                      <RotateCcw :size="12" /> 重寫
                    </button>
                    <button @click="deleteMessage(msg.id)" class="hover:text-red-500 transition-colors flex items-center gap-1 py-1 px-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 whitespace-nowrap">
                      <Trash2 :size="12" /> 移除
                    </button>
                  </template>

                  <template v-else-if="msg.role === 'user' && editingMessageId !== msg.id">
                    <button @click.stop="startEditingMessage(msg)" class="hover:text-indigo-500 transition-colors flex items-center gap-1 py-1 px-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800">
                      <Pencil :size="12" /> 編輯
                    </button>
                    <button @click.stop="deleteMessage(msg.id)" class="hover:text-red-500 transition-colors flex items-center gap-1 py-1 px-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800">
                      <Trash2 :size="12" /> 移除
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Typing indicator -->
          <div v-if="isWaitingForResponse" class="flex items-end gap-2">
             <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300 flex-shrink-0 flex items-center justify-center text-xs font-bold shadow-sm">
              AI
             </div>
             <div class="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-500 rounded-2xl rounded-bl-sm px-5 py-4 text-sm flex gap-1.5 items-center shadow-sm">
               <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
               <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.15s"></span>
               <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.3s"></span>
             </div>
          </div>

          <!-- Continue button -->
          <div v-if="showContinueBtn && !isLoading" class="flex justify-center py-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <button 
              @click="continueChat"
              class="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-full text-xs font-bold border border-indigo-200 dark:border-indigo-800 transition-all shadow-sm group"
            >
              <Plus :size="14" class="group-hover:rotate-90 transition-transform duration-300" /> 繼續回答上文
            </button>
          </div>
        </template>
        
        <div v-else class="h-full flex flex-col items-center justify-center text-gray-400 gap-3">
           <div class="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-300 dark:text-slate-600">
             <MessageSquare :size="24" />
           </div>
           <p class="text-sm border text-gray-500 dark:border-slate-800 px-4 py-2 rounded-full hidden md:block">開始一個新的對話吧！</p>
           <button @click="isSidebarOpen = true" class="md:hidden text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-full text-sm font-medium">打開側邊欄</button>
        </div>
      </div>

      <div class="p-3 md:p-4 border-t border-gray-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg">
        <!-- Image Preview Area -->
        <div v-if="selectedImages.length > 0" class="max-w-4xl mx-auto mb-3 flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2">
          <div v-for="(img, idx) in selectedImages" :key="idx" class="relative group">
            <img :src="img" class="w-16 h-16 object-cover rounded-xl border-2 border-indigo-100 dark:border-indigo-900" />
            <button 
              @click="removeSelectedImage(idx)"
              class="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X :size="10" />
            </button>
          </div>
          <button @click="triggerFileUpload" class="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-700 flex items-center justify-center text-gray-400 hover:text-indigo-500 hover:border-indigo-500 transition-all">
            <Plus :size="20" />
          </button>
        </div>

        <form @submit.prevent="sendMessage()" class="flex flex-col gap-2 max-w-4xl mx-auto bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all overflow-hidden p-2">
          <textarea 
            v-model="newMessageInput" 
            :disabled="isLoading"
            rows="1"
            :placeholder="(activeSessionId && activeSessionId !== 'new') ? '詢問後續問題...' : '發送第一條訊息以開始對話...'" 
            class="flex-1 resize-none bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-gray-200 disabled:opacity-50 outline-none leading-relaxed min-h-[44px]"
          ></textarea>
          
          <input 
            type="file" 
            ref="fileInput" 
            class="hidden" 
            accept="image/*" 
            multiple 
            @change="handleFileSelect"
          />

          <div class="flex items-center justify-between px-2 pb-1">
            <div class="flex items-center gap-2">
              <button 
                type="button" 
                @click="triggerFileUpload"
                class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-all"
                title="上傳圖片"
              >
                <Image :size="20" />
              </button>
              
              <div class="relative flex items-center">
                <select 
                  v-model="selectedModel" 
                  class="appearance-none bg-transparent pl-3 pr-8 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 outline-none cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option v-for="model in aiModels" :key="model.id" :value="model.id">{{ model.name }}</option>
                </select>
                <div class="absolute right-2 pointer-events-none text-gray-400">
                  <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <button 
              type="submit"
              :disabled="(!newMessageInput.trim() && selectedImages.length === 0) || isLoading"
              class="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all flex items-center justify-center flex-shrink-0"
            >
              <Send :size="18" />
            </button>
          </div>
        </form>
      </div>
      
    </main>

    <!-- Chat Settings Modal -->
    <Teleport to="body">
      <div v-if="isSettingsOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="isSettingsOpen = false"></div>
        <div class="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">
          <div class="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-950/50">
            <h3 class="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Settings class="text-indigo-600" :size="20" /> AI 聊天設定
            </h3>
            <button @click="isSettingsOpen = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
              <X :size="20" />
            </button>
          </div>
          
          <div class="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            <!-- Provider Info (Read-only) -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">AI 服務商</label>
              <div class="p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-gray-300">
                {{ currentProvider === 'nvidia' ? 'NVIDIA NIM' : 'OpenRouter' }} （目前啟用中）
              </div>
            </div>

            <!-- Model Selection -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">選擇模型</label>
              <select 
                v-model="chatSettings.selectedModel"
                class="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option v-for="model in aiModels" :key="model.id" :value="model.id">
                  {{ model.name }} - {{ model.description || model.id }}
                </option>
              </select>
              <p v-if="aiModels.length === 0" class="text-xs text-amber-600 dark:text-amber-400 mt-2">
                尚無可用模型，請檢查環境變數設定
              </p>
            </div>

            <!-- System Prompt / Tone -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">對話語氣</label>
              <div class="space-y-2">
                 <label 
                   v-for="tone in toneOptions" :key="tone.value"
                   class="flex items-center p-3 border rounded-xl cursor-pointer transition-all"
                   :class="chatSettings.chatTone === tone.value ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-white border-gray-100 hover:border-gray-200 dark:bg-slate-800 dark:border-slate-700'"
                 >
                   <input 
                     type="radio" 
                     :value="tone.value" 
                     v-model="chatSettings.chatTone"
                     class="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700" 
                   />
                   <span class="ml-3 text-sm font-medium text-gray-800 dark:text-gray-200 flex-1">{{ tone.label }}</span>
                 </label>
              </div>
            </div>
          </div>
          
          <div class="p-6 bg-gray-50/50 dark:bg-slate-950/50 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3">
             <button @click="isSettingsOpen = false" class="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
               取消
             </button>
             <button @click="saveSettings" :disabled="isSettingsSaving" class="px-5 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2">
               <span v-if="isSettingsSaving" class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
               儲存設定
             </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
@media (max-width: 767px) {
  .chat-mobile-full {
    /* 抵消佈局的 px-4 (1rem), pt-8 (2rem) 與 pb-28 (60px + 1rem) */
    margin: -2rem -1rem -1rem !important;
    margin-top: calc(-2rem - env(safe-area-inset-top, 0px)) !important;
    height: calc(100dvh - 60px) !important; 
    width: 100vw !important;
  }
  
  .chat-header-safe {
    padding-top: env(safe-area-inset-top, 0px);
  }
}

/* Markdown Styles */
.markdown-content :deep(p) {
  margin-bottom: 0.75rem;
}

.markdown-content :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-content :deep(pre) {
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 0.5rem;
  padding: 0.75rem;
  margin: 0.75rem 0;
  overflow-x: auto;
}

.dark .markdown-content :deep(pre) {
  background-color: rgba(0, 0, 0, 0.3);
}

.markdown-content :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.875em;
  padding: 0.1em 0.3em;
  border-radius: 0.25rem;
  background-color: rgba(0, 0, 0, 0.05);
}

.dark .markdown-content :deep(code) {
  background-color: rgba(255, 255, 255, 0.1);
}

.markdown-content :deep(pre code) {
  padding: 0;
  background-color: transparent;
}

.markdown-content :deep(ul), .markdown-content :deep(ol) {
  margin: 0.75rem 0;
  padding-left: 1.5rem;
}

.markdown-content :deep(ul) {
  list-style-type: disc;
}

.markdown-content :deep(ol) {
  list-style-type: decimal;
}

.markdown-content :deep(li) {
  margin-bottom: 0.25rem;
}

.markdown-content :deep(h1), 
.markdown-content :deep(h2), 
.markdown-content :deep(h3), 
.markdown-content :deep(h4) {
  font-weight: 700;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
  line-height: 1.25;
}

.markdown-content :deep(h1) { font-size: 1.25rem; }
.markdown-content :deep(h2) { font-size: 1.125rem; }
.markdown-content :deep(h3) { font-size: 1rem; }

.markdown-content :deep(blockquote) {
  border-left: 4px solid #e2e8f0;
  padding-left: 1rem;
  color: #64748b;
  margin: 0.75rem 0;
  font-style: italic;
}

.dark .markdown-content :deep(blockquote) {
  border-left-color: #334155;
  color: #94a3b8;
}

.markdown-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.75rem 0;
}

.markdown-content :deep(th), .markdown-content :deep(td) {
  border: 1px solid #e2e8f0;
  padding: 0.5rem;
  text-align: left;
}

.dark .markdown-content :deep(th), .dark .markdown-content :deep(td) {
  border-color: #334155;
}

.markdown-content :deep(th) {
  background-color: #f8fafc;
}

.dark .markdown-content :deep(th) {
  background-color: #1e293b;
}
</style>
