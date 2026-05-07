<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, Edit2, Trash2, Calendar, DollarSign, WalletCards, CreditCard, ExternalLink, AlertCircle } from 'lucide-vue-next'
import { useSubscriptions, type SubscriptionItem } from '~/composables/useSubscriptions'

const { subscriptions, fetchSubscriptions, createSubscription, updateSubscription, deleteSubscription, loading } = useSubscriptions()

await useAsyncData('subs-data', async () => {
  await fetchSubscriptions()
  return true
})

const showSubModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const currentSub = ref<Partial<SubscriptionItem>>({
  name: '',
  price: 0,
  currency: 'HKD',
  cycle: 'monthly',
  nextBillingDate: new Date().toISOString().split('T')[0],
  url: '',
  color: '',
  notes: ''
})

const openCreateModal = () => {
  modalMode.value = 'create'
  currentSub.value = { 
    name: '', price: 0, currency: 'HKD', cycle: 'monthly', 
    nextBillingDate: new Date().toISOString().split('T')[0],
    url: '', color: '', notes: ''
  }
  showSubModal.value = true
}

const openEditModal = (sub: SubscriptionItem) => {
  modalMode.value = 'edit'
  currentSub.value = { ...sub, nextBillingDate: sub.nextBillingDate ? new Date(sub.nextBillingDate).toISOString().split('T')[0] : '' }
  showSubModal.value = true
}

const handleSaveSub = async () => {
  if (!currentSub.value.name || currentSub.value.price === undefined) return

  if (modalMode.value === 'create') {
    await createSubscription({
      ...currentSub.value,
      nextBillingDate: currentSub.value.nextBillingDate || new Date().toISOString()
    })
  } else if (modalMode.value === 'edit' && currentSub.value.id) {
    await updateSubscription(currentSub.value.id, {
      ...currentSub.value,
      nextBillingDate: currentSub.value.nextBillingDate || new Date().toISOString()
    })
  }

  showSubModal.value = false
}

const handleDeleteSub = async (id: string) => {
  if (confirm('確定要刪除這個訂閱紀錄嗎？')) {
    await deleteSubscription(id)
  }
}

// Stats computations
const totalMonthly = computed(() => {
  return subscriptions.value.reduce((acc, sub) => {
    let monthlyPrice = sub.price
    if (sub.cycle === 'yearly') monthlyPrice = sub.price / 12
    return acc + monthlyPrice
  }, 0)
})

const totalYearly = computed(() => {
  return subscriptions.value.reduce((acc, sub) => {
    let yearlyPrice = sub.price
    if (sub.cycle === 'monthly') yearlyPrice = sub.price * 12
    return acc + yearlyPrice
  }, 0)
})

const upcomingRenewals = computed(() => {
  const now = new Date()
  const inThirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  
  return subscriptions.value.filter(sub => {
    if (!sub.nextBillingDate) return false
    const billingDate = new Date(sub.nextBillingDate)
    return billingDate >= now && billingDate <= inThirtyDays
  }).sort((a, b) => {
    return new Date(a.nextBillingDate!).getTime() - new Date(b.nextBillingDate!).getTime()
  })
})

const isOverdueOrSoon = (dateString: string | null) => {
  if (!dateString) return false
  const now = new Date()
  const date = new Date(dateString)
  const diffDays = (date.getTime() - now.getTime()) / (1000 * 3600 * 24)
  return diffDays <= 7
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '未設定'
  return new Date(dateStr).toLocaleDateString('zh-TW', { year: 'numeric', month: 'short', day: 'numeric' })
}

const formatCurrency = (amount: number, currency: string = 'HKD') => {
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}
</script>

<template>
  <div class="space-y-6 max-w-5xl mx-auto pb-20">
    <!-- Header -->
    <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div class="space-y-1">
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white">訂閱追蹤</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">管理你的定期花費與服務訂閱</p>
      </div>

      <div class="flex gap-2 w-full md:w-auto">
        <button 
          @click="openCreateModal"
          class="flex-1 md:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white px-4 py-2.5 text-sm font-semibold hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all active:scale-95 shadow-sm"
        >
          <Plus class="w-4 h-4" />
          新增訂閱
        </button>
      </div>
    </div>

    <!-- Overview Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200 dark:shadow-none">
        <div class="flex items-center gap-2 text-indigo-100 mb-2">
          <WalletCards class="w-5 h-5" />
          <h3 class="font-medium">預估總支出</h3 >
        </div>
        <div class="flex items-baseline gap-2 mb-1">
          <span class="text-4xl font-bold tracking-tight">{{ formatCurrency(totalMonthly) }}</span>
          <span class="text-indigo-100 font-medium">/ 月</span>
        </div>
        <div class="text-sm text-indigo-200">
          約合 {{ formatCurrency(totalYearly) }} / 年
        </div>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center">
        <div class="flex flex-col mb-4">
          <div class="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-3">
            <AlertCircle class="w-5 h-5 text-amber-500" />
            <h3 class="font-medium">三十天內即將續約</h3>
          </div>
          
          <div v-if="upcomingRenewals.length > 0" class="space-y-3">
            <div 
              v-for="sub in upcomingRenewals.slice(0, 3)" 
              :key="sub.id"
              class="flex justify-between items-center"
            >
              <span class="text-sm font-medium text-slate-900 dark:text-white line-clamp-1 w-1/2">{{ sub.name }}</span>
              <div class="flex items-center gap-3 text-sm">
                <span class="text-slate-500 dark:text-slate-400 font-medium">{{ formatDate(sub.nextBillingDate) }}</span>
                <span class="font-bold text-slate-800 dark:text-slate-200">{{ formatCurrency(sub.price, sub.currency) }}</span>
              </div>
            </div>
          </div>
          <div v-else class="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
            沒有即將到期的訂閱紀錄
          </div>
        </div>
      </div>
    </div>

    <!-- Content Status -->
    <div v-if="loading && subscriptions.length === 0" class="py-20 text-center">
      <div class="inline-block animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600 h-8 w-8 mb-4"></div>
      <p class="text-slate-500">載入訂閱中...</p>
    </div>

    <div v-else-if="subscriptions.length === 0" class="py-20 text-center px-4">
      <div class="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <CreditCard class="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
      </div>
      <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">尚無訂閱紀錄</h3>
      <p class="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
        記錄你使用的串流平台、軟體服務，掌控你的財務狀況。
      </p>
    </div>

    <!-- List -->
    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="sub in subscriptions"
        :key="sub.id"
        class="group flex flex-col bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 hover:shadow-xl dark:hover:border-slate-600 transition-all p-5"
        :class="{ 'border-rose-300 dark:border-rose-500/50 bg-rose-50/30 dark:bg-rose-900/10': isOverdueOrSoon(sub.nextBillingDate) }"
      >
        <div class="flex justify-between items-start mb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 shadow-inner overflow-hidden" :style="{ backgroundColor: sub.color ? `${sub.color}20` : '', color: sub.color || '' }">
               {{ sub.name.charAt(0).toUpperCase() }}
            </div>
            <div>
              <h3 class="font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {{ sub.name }}
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">{{ sub.cycle === 'monthly' ? '月繳' : '年繳' }}</p>
            </div>
          </div>
          
          <div class="flex items-center gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              @click="openEditModal(sub)"
              class="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-600 transition-colors"
            >
              <Edit2 class="w-3.5 h-3.5" />
            </button>
            <button 
              @click="handleDeleteSub(sub.id)"
              class="p-1.5 text-slate-500 hover:text-red-500 dark:hover:text-red-400 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-red-50 dark:hover:bg-slate-600 transition-colors"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        
        <div class="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div class="flex items-center gap-1.5 text-sm" :class="isOverdueOrSoon(sub.nextBillingDate) ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-slate-500 dark:text-slate-400'">
            <Calendar class="w-3.5 h-3.5" />
            <span>{{ formatDate(sub.nextBillingDate) }}</span>
          </div>
          
          <div class="font-bold text-slate-900 dark:text-white text-lg">
            {{ formatCurrency(sub.price, sub.currency) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Subscription Modal -->
    <div v-if="showSubModal" class="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-black/40 backdrop-blur-sm" @click.self="showSubModal = false">
      <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div class="p-6 overflow-y-auto">
          <h3 class="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
            {{ modalMode === 'create' ? '新增訂閱' : '編輯訂閱' }}
          </h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">服務名稱 *</label>
              <input 
                v-model="currentSub.name" 
                type="text" 
                placeholder="例如: Netflix, Spotify" 
                class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
            
            <div class="flex gap-4">
              <div class="flex-1">
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">金額 *</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span class="text-slate-500 sm:text-sm">$</span>
                  </div>
                  <input 
                    v-model="currentSub.price" 
                    type="number" 
                    min="0"
                    step="0.01"
                    placeholder="0.00" 
                    class="w-full pl-7 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div class="w-1/3">
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">幣種</label>
                <select 
                  v-model="currentSub.currency"
                  class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                >
                  <option value="HKD">HKD ($)</option>
                  <option value="TWD">TWD (NT$)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
              </div>
            </div>

            <div class="flex gap-4">
              <div class="flex-1">
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">扣款週期</label>
                <select 
                  v-model="currentSub.cycle"
                  class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                >
                  <option value="monthly">每月</option>
                  <option value="yearly">每年</option>
                </select>
              </div>
              <div class="flex-1">
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">下次扣款日</label>
                <input 
                  v-model="currentSub.nextBillingDate" 
                  type="date" 
                  class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white block"
                />
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">網址 (選填)</label>
              <input 
                v-model="currentSub.url" 
                type="url" 
                placeholder="https://netflix.com" 
                class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>
          
          <div class="mt-8 flex justify-end gap-3">
            <button 
              @click="showSubModal = false"
              class="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              取消
            </button>
            <button 
              @click="handleSaveSub"
              :disabled="!currentSub.name || currentSub.price === undefined || currentSub.price === null"
              class="px-5 py-2 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              儲存紀錄
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
