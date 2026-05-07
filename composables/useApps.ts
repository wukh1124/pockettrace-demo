export interface AppItem {
  id: string;
  userId: string;
  name: string;
  url: string;
  icon: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export const useApps = () => {
  const apps = useState<AppItem[]>('apps', () => [])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchApps = async () => {
    loading.value = true
    error.value = null
    try {
      const headers = useRequestHeaders(['cookie']) as Record<string, string>
      const data = await $fetch<AppItem[]>('/api/apps', {
        headers
      })
      if (data) {
        apps.value = data
      }
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch apps'
    } finally {
      loading.value = false
    }
  }

  const createApp = async (payload: Partial<AppItem>) => {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<AppItem>('/api/apps', {
        method: 'POST',
        body: payload
      })
      if (data) {
        apps.value.push(data)
      }
      return data
    } catch (e: any) {
      error.value = e.message || 'Failed to create app'
      return null
    } finally {
      loading.value = false
    }
  }

  const updateApp = async (id: string, payload: Partial<AppItem>) => {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<AppItem>(`/api/apps/${id}`, {
        method: 'PUT',
        body: payload
      })
      if (data) {
        const index = apps.value.findIndex(a => a.id === id)
        if (index !== -1) {
          apps.value[index] = data
        }
      }
      return data
    } catch (e: any) {
      error.value = e.message || 'Failed to update app'
      return null
    } finally {
      loading.value = false
    }
  }

  const deleteApp = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      await $fetch(`/api/apps/${id}`, {
        method: 'DELETE'
      })
      apps.value = apps.value.filter(a => a.id !== id)
      return true
    } catch (e: any) {
      error.value = e.message || 'Failed to delete app'
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    apps,
    loading,
    error,
    fetchApps,
    createApp,
    updateApp,
    deleteApp
  }
}
