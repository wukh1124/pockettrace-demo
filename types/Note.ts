export type TagId = 'all' | 'work' | 'personal' | 'ideas' | 'travel' | 'diary' | 'none'
export type NoteTag = Exclude<TagId, 'all'>

export interface Note {
    recordId: string
    id: string
    title: string
    content: string
    wordCount?: number
    tag: NoteTag
    allTags?: string[]
    badges?: string[]
    updatedAt: string
    featured?: boolean
    cover?: string
    listItems?: string[]
    monospace?: boolean
    collaborators?: { name: string; initials: string; color: string }[]
    shareEnabled?: boolean
    shareToken?: string
    shareExpiresAt?: string | null
    created: string
    lastModified: string
    rawCreated: string
    rawUpdated: string
    isArchived?: boolean
}

export const TAGS: { id: TagId; label: string; icon: any }[] = [
    // 'all' removed from UI list, handled as default null state equivalent

    { id: 'work', label: '工作', icon: 'Briefcase' },
    { id: 'personal', label: '個人', icon: 'User' },
    { id: 'ideas', label: '靈感', icon: 'Lightbulb' },
    { id: 'travel', label: '旅行', icon: 'Plane' },
    { id: 'diary', label: '日記', icon: 'Book' },
]

export const TAG_STYLES: Record<NoteTag, { badge: string }> = {
    work: {
        badge: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    },
    personal: {
        badge: 'bg-amber-50 text-amber-700 border-amber-100',
    },
    ideas: {
        badge: 'bg-purple-50 text-purple-700 border-purple-100',
    },
    travel: {
        badge: 'bg-teal-50 text-teal-700 border-teal-100',
    },
    diary: {
        badge: 'bg-slate-100 text-slate-600 border-slate-200',
    },
    none: {
        badge: 'bg-slate-50 text-slate-400 border-slate-100 hidden',
    },
}

export const TAG_LABELS: Record<NoteTag, string> = {
    work: '工作',
    personal: '個人',
    ideas: '靈感',
    travel: '旅行',
    diary: '日記',
    none: '',
}
