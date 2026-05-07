import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { authClient, useSession, signOut } from '../utils/auth-client'
import { useDemo } from './useDemo'

export function useAuth() {
    const router = useRouter()
    const session = useSession()
    const { isDemoMode } = useDemo()

    const user = computed(() => {
        if (isDemoMode.value) {
            return {
                id: 'demo-user',
                name: 'Demo User',
                email: 'demo@example.com',
                emailVerified: true,
                image: null,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        }
        return session.value?.data?.user
    })
    const isValid = computed(() => isDemoMode.value || !!session.value?.data?.user)

    const logout = async () => {
        // Demo 模式：禁止登出，直接返回
        if (isDemoMode.value) {
            console.warn('[Demo Mode] 無法登出 Demo 模式');
            return;
        }
        
        await signOut()
        await navigateTo('/login', { external: true })
    }

    const updateProfile = async (formData: FormData) => {
        const name = formData.get('name') as string
        const image = formData.get('avatar') as File | null
        try {
            let imageDataUrl: string | undefined = undefined

            if (image && image.size > 0) {
                // 將圖片壓縮並轉為 Base64 Data URL，以便持久化存儲
                imageDataUrl = await compressAndConvertToDataUrl(image, 200, 0.8)
            }

            await authClient.updateUser({
                name,
                ...(imageDataUrl ? { image: imageDataUrl } : {})
            })
            return true
        } catch (error) {
            console.error('Update profile failed:', error)
            throw error
        }
    }

    /**
     * 壓縮圖片並轉成 Base64 Data URL
     * @param file 原始圖片檔案
     * @param maxSize 最大邊長（像素）
     * @param quality JPEG 品質 (0-1)
     */
    const compressAndConvertToDataUrl = (file: File, maxSize: number, quality: number): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => {
                const img = new Image()
                img.onload = () => {
                    const canvas = document.createElement('canvas')
                    let { width, height } = img

                    // 等比縮放
                    if (width > maxSize || height > maxSize) {
                        if (width > height) {
                            height = Math.round((height / width) * maxSize)
                            width = maxSize
                        } else {
                            width = Math.round((width / height) * maxSize)
                            height = maxSize
                        }
                    }

                    canvas.width = width
                    canvas.height = height
                    const ctx = canvas.getContext('2d')!
                    ctx.drawImage(img, 0, 0, width, height)

                    resolve(canvas.toDataURL('image/jpeg', quality))
                }
                img.onerror = reject
                img.src = e.target?.result as string
            }
            reader.onerror = reject
            reader.readAsDataURL(file)
        })
    }

    const changePassword = async (data: any) => {
        // Demo 模式禁止修改密碼
        if (isDemoMode.value) {
            console.error('[Demo Mode] 禁止修改密碼');
            throw new Error('Demo 模式下無法修改密碼');
        }

        try {
            await authClient.changePassword({
                newPassword: data.password,
                currentPassword: data.oldPassword,
                revokeOtherSessions: true
            })
            return true
        } catch (error) {
            console.error('Change password failed:', error)
            throw error
        }
    }

    const getAvatarUrl = (record: any) => {
        return record?.image || null
    }

    return {
        user,
        isValid,
        logout,
        updateProfile,
        changePassword,
        getAvatarUrl
    }
}
