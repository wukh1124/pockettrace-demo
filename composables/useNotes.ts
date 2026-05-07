import { ref } from 'vue'
import type { Note, NoteTag } from '../types/Note'
import { useNotification } from './useNotification'
import { $fetch } from 'ofetch' // Nuxt auto-imports but we'll use ofetch if needed outside
import { countPlainTextWords } from '../utils/stripMarkdown'

const primaryTagCandidates: NoteTag[] = ['work', 'personal', 'ideas', 'travel', 'diary']

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

// 使用共用的 stripMarkdownForPreview 進行字數計算
const countMarkdownWords = (text: string) => countPlainTextWords(text)

const resolvePrimaryTag = (tags: string[]): NoteTag => {
    const match = tags.find((tag) => primaryTagCandidates.includes(tag as NoteTag))
    return (match as NoteTag) || 'none'
}

const formatDate = (value?: string | number | Date | null) => {
    if (!value) return '尚未更新'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)
    const d = new Intl.DateTimeFormat('zh-TW', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    }).format(date)
    const t = new Intl.DateTimeFormat('zh-TW', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(date)
    return `${d} ${t}`
}

const hydrateNotes = (records: any[]): Note[] => {
    return records.map((record) => {
        const tags = normalizeTags(record.tags)
        const primaryTag = resolvePrimaryTag(tags)
        const badges = tags
            .filter((tag) => tag !== primaryTag)
            .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))

        return {
            recordId: record.id,
            id: record.id,
            title: record.title || '未命名',
            content: record.content || '',
            wordCount: countMarkdownWords(record.content || ''),
            tag: primaryTag,
            allTags: tags,
            badges,
            updatedAt: formatDate(record.publishedAt || record.updatedAt),
            created: formatDate(record.createdAt),
            lastModified: formatDate(record.updatedAt),
            rawCreated: record.createdAt,
            rawUpdated: record.updatedAt,
            featured: false,
            monospace: Boolean(tags.includes('reference')),
            shareEnabled: Boolean(record.shareEnabled),
            shareToken: record.shareToken || '',
            shareExpiresAt: record.shareExpiresAt || null,
            isArchived: Boolean(record.isArchived),
        }
    })
}

export function useNotes() {
    const notes = ref<Note[]>([])
    const isLoading = ref(true)
    const isAppending = ref(false)
    const errorMessage = ref('')
    const shareBusy = ref<Record<string, boolean>>({})

    const { showNotice } = useNotification()

    const setShareNotice = (type: 'success' | 'error', text: string) => {
        showNotice(text, type)
    }

    const currentPage = ref(1)
    const totalPages = ref(1)
    const totalItems = ref(0)
    const itemsPerPage = ref(10)

    const fetchNotes = async (page = 1, append = false, filter = '', sort = '-published_at') => {
        if (append) {
            isAppending.value = true
        } else {
            isLoading.value = true
        }
        errorMessage.value = ''
        try {
            // Updated to fetch from Nuxt server/api
            const list: any = await $fetch('/api/notes', {
                params: {
                    page,
                    perPage: itemsPerPage.value,
                    sort,
                    filter
                }
            })

            const newNotes = hydrateNotes(list.items)

            if (append) {
                notes.value = [...notes.value, ...newNotes]
            } else {
                notes.value = newNotes
            }

            currentPage.value = list.page
            totalPages.value = list.totalPages
            totalItems.value = list.totalItems

        } catch (error: any) {
            errorMessage.value = '讀取筆記失敗。'
            if (!append) notes.value = []
            console.error(error)
        } finally {
            isLoading.value = false
            isAppending.value = false
        }
    }

    const loadMore = async (filter = '', sort = '-published_at') => {
        if (currentPage.value < totalPages.value) {
            await fetchNotes(currentPage.value + 1, true, filter, sort)
        }
    }

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

    const toggleShare = async (note: Note) => {
        if (shareBusy.value[note.id]) return
        shareBusy.value[note.id] = true

        try {
            if (note.shareEnabled) {
                await $fetch(`/api/notes/${note.id}`, {
                    method: 'PATCH',
                    body: { shareEnabled: false }
                })
                note.shareEnabled = false
                showNotice('已取消分享', 'success')
            } else {
                const token = note.shareToken || generateShareToken()
                await $fetch(`/api/notes/${note.id}`, {
                    method: 'PATCH',
                    body: { shareEnabled: true, shareToken: token }
                })
                note.shareEnabled = true
                note.shareToken = token
                showNotice('已產生分享連結', 'success')
            }
        } catch (error) {
            console.error(error)
            showNotice('更新分享狀態失敗，請稍後再試。', 'error')
        } finally {
            shareBusy.value[note.id] = false
        }
    }

    const deleteNote = async (note: Note) => {
        if (shareBusy.value[note.id]) return
        shareBusy.value[note.id] = true

        try {
            await $fetch(`/api/notes/${note.id}`, { method: 'DELETE' })
            notes.value = notes.value.filter((item) => item.id !== note.id)
            showNotice('已刪除筆記', 'success')
        } catch (error) {
            console.error(error)
            showNotice('刪除失敗，請稍後再試。', 'error')
        } finally {
            shareBusy.value[note.id] = false
        }
    }

    const toggleArchive = async (note: Note) => {
        if (shareBusy.value[note.id]) return
        shareBusy.value[note.id] = true

        try {
            const newStatus = !note.isArchived;
            await $fetch(`/api/notes/${note.id}`, {
                method: 'PATCH',
                body: { isArchived: newStatus }
            })
            note.isArchived = newStatus
            
            // if we are displaying active notes and note is archived, remove it from list
            // or we could just refetch but let's do optimistic local update if needed,
            // actually filtering it locally might be confusing if user is on 'Archived' tab.
            // By default we don't automatically remove it unless user refreshes.
            
            showNotice(newStatus ? '已封存筆記' : '已取消封存', 'success')
        } catch (error) {
            console.error(error)
            showNotice('更新失敗，請稍後再試。', 'error')
        } finally {
            shareBusy.value[note.id] = false
        }
    }

    return {
        notes,
        isLoading,
        isAppending,
        errorMessage,
        shareBusy,
        setShareNotice,
        fetchNotes,
        toggleShare,
        toggleArchive,
        deleteNote,
        countMarkdownWords,
        currentPage,
        totalPages,
        totalItems,
        itemsPerPage,
        loadMore,
    }
}
