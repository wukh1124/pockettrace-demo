import { ref } from 'vue'

export type NoticeType = 'success' | 'error' | 'info'

const message = ref('')
const type = ref<NoticeType>('success')
const isVisible = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

export function useNotification() {
    const showNotice = (msg: string, noticeType: NoticeType = 'success', duration = 3000) => {
        message.value = msg
        type.value = noticeType
        isVisible.value = true

        if (timer) clearTimeout(timer)

        if (duration > 0) {
            timer = setTimeout(() => {
                closeNotice()
            }, duration)
        }
    }

    const closeNotice = () => {
        isVisible.value = false
        // Clear message after animation for smoothness, optionally
        setTimeout(() => {
            if (!isVisible.value) {
                message.value = ''
            }
        }, 300)
    }

    return {
        message,
        type,
        isVisible,
        showNotice,
        closeNotice
    }
}
