/**
 * 將 Markdown / HTML 內容轉換為純文字，用於筆記預覽和字數計算。
 *
 * 過濾規則：
 * - 移除所有 HTML 標籤（包含 <script>、<style> 及其內容）
 * - 移除 Markdown 圖片語法 ![alt](url)
 * - 移除 Markdown 連結語法但保留文字 [text](url) → text
 * - 移除程式碼區塊 ```...``` 及行內程式碼 `...`（保留程式碼內容）
 * - 移除標題符號 #
 * - 移除粗體 / 斜體標記但保留內文
 * - 移除清單標記 (-, *, +, 1.)
 * - 移除 Markdown 水平線 (---, ***, ___)
 * - 移除引用標記 >
 * - 移除 Markdown 表格語法
 * - 合併多餘空白
 */
export function stripMarkdownForPreview(text: string): string {
  if (!text) return ''

  let result = text

  // 1. 移除 <script>...</script> 和 <style>...</style>（含內容）
  result = result.replace(/<script[\s\S]*?<\/script>/gi, '')
  result = result.replace(/<style[\s\S]*?<\/style>/gi, '')

  // 2. 移除所有 HTML 標籤（但保留標籤間的文字）
  result = result.replace(/<[^>]+>/g, '')

  // 3. 移除 Markdown 圖片語法 ![alt](url) — 整個移除（圖片無需顯示文字）
  result = result.replace(/!\[([^\]]*)\]\([^)]*\)/g, '')

  // 4. 移除 Markdown 連結語法但保留文字 [text](url) → text
  result = result.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')

  // 5. 移除圍欄式程式碼區塊 ```...```（保留程式碼本身）
  result = result.replace(/```[\w]*\n?([\s\S]*?)```/g, '$1')

  // 6. 移除行內程式碼反引號但保留內容
  result = result.replace(/`([^`]+)`/g, '$1')

  // 7. 移除粗體 / 斜體標記（** __ * _）但保留內容
  result = result.replace(/(\*\*|__)(.*?)\1/g, '$2')
  result = result.replace(/(\*|_)(.*?)\1/g, '$2')

  // 8. 移除刪除線 ~~text~~ → text
  result = result.replace(/~~(.*?)~~/g, '$1')

  // 9. 移除標題符號
  result = result.replace(/^#{1,6}\s+/gm, '')

  // 10. 移除引用標記 >
  result = result.replace(/^\s*>+\s?/gm, '')

  // 11. 移除無序和有序清單標記
  result = result.replace(/^\s*([-*+]|\d+\.)\s+/gm, '')

  // 12. 移除水平線 (---, ***, ___)
  result = result.replace(/^(\s*[-*_]){3,}\s*$/gm, '')

  // 13. 移除 Markdown 表格分隔線 |---|---|
  result = result.replace(/^\|?[\s:]*-{2,}[\s:]*(\|[\s:]*-{2,}[\s:]*)*\|?\s*$/gm, '')
  // 移除表格管道符號但保留內容
  result = result.replace(/\|/g, ' ')

  // 14. 移除 HTML 實體（常見的）
  result = result.replace(/&[a-zA-Z]+;/g, ' ')
  result = result.replace(/&#\d+;/g, ' ')

  // 15. 移除參考連結定義 [id]: url
  result = result.replace(/^\s*\[[^\]]+\]:\s+.*$/gm, '')

  // 16. 合併多餘空白和換行
  result = result.replace(/\n{2,}/g, '\n')
  result = result.replace(/[ \t]+/g, ' ')
  result = result.trim()

  return result
}

/**
 * 計算過濾後內容的字數（CJK 混合英文使用字元數作為計算基準）
 */
export function countPlainTextWords(text: string): number {
  const plain = stripMarkdownForPreview(text)
  // 移除所有空白後計算字元數（適用於中日韓混合英文場景）
  return plain.replace(/\s+/g, '').length
}
