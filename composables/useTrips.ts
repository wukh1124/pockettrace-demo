import type { Trip } from '~/types/Trips'

export const useTrips = () => {
  const trips = useState<Trip[]>('trips', () => [])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchTrips = async () => {
    loading.value = true
    error.value = null
    try {
      const headers = useRequestHeaders(['cookie']) as Record<string, string>
      const data = await $fetch<Trip[]>('/api/trips', {
        headers
      })
      
      if (data) {
        trips.value = data
      }
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch trips'
    } finally {
      loading.value = false
    }
  }

  const getTrip = async (id: string): Promise<Trip | null> => {
    try {
      const headers = useRequestHeaders(['cookie']) as Record<string, string>
      return await $fetch<Trip>(`/api/trips/${id}`, {
        headers
      })
    } catch (e) {
      console.error('Error fetching trip:', e)
      return null
    }
  }

  const createTrip = async (payload: Partial<Trip>) => {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<Trip>('/api/trips', {
        method: 'POST',
        body: payload
      })
      if (data) {
        trips.value.unshift(data)
      }
      return data
    } catch (e: any) {
      error.value = e.message || 'Failed to create trip'
      return null
    } finally {
      loading.value = false
    }
  }

  const updateTrip = async (id: string, payload: Partial<Trip>) => {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<Trip>(`/api/trips/${id}`, {
        method: 'PUT',
        body: payload
      })
      if (data) {
        const index = trips.value.findIndex(t => t.id === id)
        if (index !== -1) {
          trips.value[index] = data
        }
      }
      return data
    } catch (e: any) {
      error.value = e.message || 'Failed to update trip'
      return null
    } finally {
      loading.value = false
    }
  }

  const deleteTrip = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      await $fetch(`/api/trips/${id}`, {
        method: 'DELETE'
      })
      trips.value = trips.value.filter(t => t.id !== id)
      return true
    } catch (e: any) {
      error.value = e.message || 'Failed to delete trip'
      return false
    } finally {
      loading.value = false
    }
  }

  const generateTripFromAI = async (prompt: string): Promise<Partial<Trip> | null> => {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<Partial<Trip>>('/api/trips/generate', {
        method: 'POST',
        body: { prompt }
      })
      
      return data || null
    } catch (e: any) {
      error.value = e.message || 'Failed to generate trip from AI'
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    trips,
    loading,
    error,
    fetchTrips,
    getTrip,
    createTrip,
    updateTrip,
    deleteTrip,
    generateTripFromAI
  }
}
