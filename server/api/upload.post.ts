import { defineEventHandler, readMultipartFormData } from 'h3'
import { requireAuth } from '../utils/session'
import { nanoid } from 'nanoid'
import { writeFile, mkdir } from 'node:fs/promises'
import { join, extname } from 'node:path'

/**
 * POST /api/upload
 * 上傳圖片到 public/uploads/ 目錄
 * 需要登入驗證
 * 支援多檔上傳，回傳每張圖片的可存取 URL
 */

// 允許的圖片 MIME 類型
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/avif',
]

// 單檔最大 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024

// 速率限制設定
const RATE_LIMIT_HOURLY = 20      // 每小時最多上傳次數
const RATE_LIMIT_DAILY_MB = 100   // 每日最多上傳 MB
const RATE_LIMIT_DAILY_BYTES = RATE_LIMIT_DAILY_MB * 1024 * 1024

// MIME 類型對應副檔名
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/bmp': '.bmp',
  'image/avif': '.avif',
}

// 上傳記錄（記憶體儲存，重啟後重置）
interface UploadRecord {
  count: number
  bytes: number
  hourStart: number
  dayStart: number
}
const uploadRecords = new Map<string, UploadRecord>()

// 清理過期的上傳記錄（每小時清理一次）
let lastCleanup = Date.now()
function cleanupRecords() {
  const now = Date.now()
  if (now - lastCleanup < 3600000) return // 每小時清理一次
  lastCleanup = now
  const oneDayAgo = now - 86400000
  for (const [userId, record] of uploadRecords.entries()) {
    if (record.dayStart < oneDayAgo) {
      uploadRecords.delete(userId)
    }
  }
}

// 檢查速率限制
function checkRateLimit(userId: string, fileSize: number): { allowed: boolean; message?: string } {
  cleanupRecords()
  const now = Date.now()
  const currentHour = Math.floor(now / 3600000)
  const currentDay = Math.floor(now / 86400000)

  let record = uploadRecords.get(userId)
  if (!record) {
    record = { count: 0, bytes: 0, hourStart: currentHour, dayStart: currentDay }
    uploadRecords.set(userId, record)
  }

  // 檢查是否需要重置小時計數器
  if (record.hourStart < currentHour) {
    record.count = 0
    record.hourStart = currentHour
  }

  // 檢查是否需要重置日計數器
  if (record.dayStart < currentDay) {
    record.bytes = 0
    record.dayStart = currentDay
  }

  // 檢查每小時次數限制
  if (record.count >= RATE_LIMIT_HOURLY) {
    return { allowed: false, message: `每小時最多上傳 ${RATE_LIMIT_HOURLY} 次，請稍後再試` }
  }

  // 檢查每日流量限制
  if (record.bytes + fileSize > RATE_LIMIT_DAILY_BYTES) {
    return { allowed: false, message: `每日上傳流量上限為 ${RATE_LIMIT_DAILY_MB}MB，請明日再試` }
  }

  return { allowed: true }
}

// 記錄上傳
function recordUpload(userId: string, fileSize: number) {
  const record = uploadRecords.get(userId)
  if (record) {
    record.count++
    record.bytes += fileSize
  }
}

export default defineEventHandler(async (event) => {
  // 驗證登入狀態
  const session = await requireAuth(event)
  const userId = session.user.id

  // 讀取 multipart form data
  const formData = await readMultipartFormData(event)

  if (!formData || formData.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: '未收到任何檔案',
    })
  }

  // 確保上傳目錄存在
  const uploadDir = join(process.cwd(), 'public', 'uploads')
  await mkdir(uploadDir, { recursive: true })

  const urls: string[] = []

  for (const file of formData) {
    // 只處理 file 欄位名稱為 'file' 的項目
    if (file.name !== 'file') continue

    const mimeType = file.type || ''
    const originalName = file.filename || ''

    // 驗證檔案類型
    if (!ALLOWED_TYPES.includes(mimeType)) {
      throw createError({
        statusCode: 400,
        statusMessage: `不支援的檔案類型：${mimeType}。僅支援 JPEG、PNG、GIF、WebP、SVG、BMP、AVIF`,
      })
    }

    // 驗證檔案大小
    if (file.data.length > MAX_FILE_SIZE) {
      throw createError({
        statusCode: 400,
        statusMessage: `檔案大小超過限制（最大 5MB）：${originalName}`,
      })
    }

    // 檢查速率限制
    const rateCheck = checkRateLimit(userId, file.data.length)
    if (!rateCheck.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: rateCheck.message || '上傳頻率過高，請稍後再試',
      })
    }

    // 產生唯一檔名：時間戳 + nanoid + 副檔名
    const ext = MIME_TO_EXT[mimeType] || extname(originalName) || '.bin'
    const timestamp = Date.now()
    const uniqueId = nanoid(10)
    const fileName = `${timestamp}-${uniqueId}${ext}`

    // 寫入檔案
    const filePath = join(uploadDir, fileName)
    await writeFile(filePath, file.data)

    // 記錄上傳以更新速率限制
    recordUpload(userId, file.data.length)

    // 回傳可直接存取的 URL（Nuxt public/ 下的檔案自動對外服務）
    urls.push(`/uploads/${fileName}`)
  }

  if (urls.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: '未收到有效的圖片檔案',
    })
  }

  return { urls }
})
