export interface SubscriptionItem {
  id: string;
  userId: string;
  name: string;
  price: number;
  currency: string;
  cycle: 'monthly' | 'yearly';
  nextBillingDate: string | null;
  url: string | null;
  color: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export const useSubscriptions = () => {
  const subscriptions = useState<SubscriptionItem[]>('subscriptions', () => [])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchSubscriptions = async () => {
    loading.value = true
    error.value = null
    try {
      const headers = useRequestHeaders(['cookie']) as Record<string, string>
      const data = await $fetch<SubscriptionItem[]>('/api/subscriptions', {
        headers
      })
      if (data) {
        subscriptions.value = data
      }
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch subscriptions'
    } finally {
      loading.value = false
    }
  }

  const createSubscription = async (payload: Partial<SubscriptionItem>) => {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<SubscriptionItem>('/api/subscriptions', {
        method: 'POST',
        body: payload
      })
      if (data) {
        subscriptions.value.push(data)
        subscriptions.value.sort((a, b) => {
          const dateA = a.nextBillingDate ? new Date(a.nextBillingDate).getTime() : 0;
          const dateB = b.nextBillingDate ? new Date(b.nextBillingDate).getTime() : 0;
          return dateA - dateB;
        })
      }
      return data
    } catch (e: any) {
      error.value = e.message || 'Failed to create subscription'
      return null
    } finally {
      loading.value = false
    }
  }

  const updateSubscription = async (id: string, payload: Partial<SubscriptionItem>) => {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<SubscriptionItem>(`/api/subscriptions/${id}`, {
        method: 'PUT',
        body: payload
      })
      if (data) {
        const index = subscriptions.value.findIndex(s => s.id === id)
        if (index !== -1) {
          subscriptions.value[index] = data
          subscriptions.value.sort((a, b) => {
            const dateA = a.nextBillingDate ? new Date(a.nextBillingDate).getTime() : 0;
            const dateB = b.nextBillingDate ? new Date(b.nextBillingDate).getTime() : 0;
            return dateA - dateB;
          })
        }
      }
      return data
    } catch (e: any) {
      error.value = e.message || 'Failed to update subscription'
      return null
    } finally {
      loading.value = false
    }
  }

  const deleteSubscription = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      await $fetch(`/api/subscriptions/${id}`, {
        method: 'DELETE'
      })
      subscriptions.value = subscriptions.value.filter(s => s.id !== id)
      return true
    } catch (e: any) {
      error.value = e.message || 'Failed to delete subscription'
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    subscriptions,
    loading,
    error,
    fetchSubscriptions,
    createSubscription,
    updateSubscription,
    deleteSubscription
  }
}
