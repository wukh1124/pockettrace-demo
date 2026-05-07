import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import type Token from 'markdown-it/lib/token.mjs'
import type Renderer from 'markdown-it/lib/renderer.mjs'

let md: MarkdownIt

md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(code, { language: lang }).value}</code></pre>`
      } catch {
        return `<pre class="hljs"><code>${md.utils.escapeHtml(code)}</code></pre>`
      }
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(code)}</code></pre>`
  },
})

md.renderer.rules.link_open = (tokens: Token[], idx: number, options: any, _env: any, self: Renderer) => {
  const token = tokens[idx]
  if (!token) return self.renderToken(tokens, idx, options)

  const hrefIndex = token.attrIndex('href')
  if (hrefIndex >= 0) {
    token.attrSet('rel', 'noopener noreferrer')
    token.attrSet('target', '_blank')
  }
  return self.renderToken(tokens, idx, options)
}

export const renderMarkdown = (value: string) =>
  DOMPurify.sanitize(md.render(value || ''), {
    USE_PROFILES: { html: true },
  })
