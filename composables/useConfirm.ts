import { ref } from 'vue'

interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
}

const isVisible = ref(false)
const title = ref('')
const message = ref('')
const confirmText = ref('確定')
const cancelText = ref('取消')

let resolvePromise: (value: boolean) => void

export const useConfirm = () => {
  const confirm = (options: ConfirmOptions | string) => {
    if (typeof options === 'string') {
      message.value = options
      title.value = '提示'
      confirmText.value = '確定'
      cancelText.value = '取消'
    } else {
      message.value = options.message
      title.value = options.title || '提示'
      confirmText.value = options.confirmText || '確定'
      cancelText.value = options.cancelText || '取消'
    }

    isVisible.value = true

    return new Promise<boolean>((resolve) => {
      resolvePromise = resolve
    })
  }

  const onConfirm = () => {
    isVisible.value = false
    resolvePromise(true)
  }

  const onCancel = () => {
    isVisible.value = false
    resolvePromise(false)
  }

  return {
    isVisible,
    title,
    message,
    confirmText,
    cancelText,
    confirm,
    onConfirm,
    onCancel
  }
}
