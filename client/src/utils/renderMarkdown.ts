function esc(s: string): string {
  if (!s) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function codeHeader(lang: string, code: string): string {
  const label = lang || 'code'
  const encoded = encodeURIComponent(code)
  return `<div class="code-block-wrap">
    <div class="code-block-header">
      <span class="code-lang-badge">${esc(label)}</span>
      <button class="code-copy-btn" data-code="${encoded}" onclick="(function(b){var t=document.createElement('textarea');t.value=decodeURIComponent(b.getAttribute('data-code'));document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);b.textContent='Copied!';b.classList.add('copied');setTimeout(function(){b.textContent='Copy';b.classList.remove('copied')},2000)})(this)">Copy</button>
    </div>
    <pre><code>${esc(code.trimEnd())}</code></pre>
  </div>`
}

export function renderMarkdown(text: string): string {
  if (!text) return ''

  // Extract and protect fenced code blocks
  const blocks: string[] = []
  let html = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    blocks.push(codeHeader(lang, code))
    return `\x00BLOCK${blocks.length - 1}\x00`
  })

  // Collapse excessive blank lines (3+ → 2) to avoid giant gaps
  html = html.replace(/\n{3,}/g, '\n\n')

  // Extract and protect inline code
  const inlines: string[] = []
  html = html.replace(/`([^`]+)`/g, (_, code) => {
    inlines.push(`<code>${esc(code)}</code>`)
    return `\x00INLINE${inlines.length - 1}\x00`
  })

  // Escape HTML
  html = esc(html)

  // Headings
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>')
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // Strikethrough
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>')

  // Bold / italic
  html = html.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')

  // Highlight (==text==)
  html = html.replace(/==([^=]+)==/g, '<mark>$1</mark>')

  // Images (before links)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')

  // Horizontal rules
  html = html.replace(/^(---+|\*\*\*+)$/gm, '<hr>')

  // Blockquotes (support nested > and multi-line)
  html = html.replace(/^&gt; (.*)$/gm, '<blockquote><p>$1</p></blockquote>')
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n')

  // Task lists (before regular lists)
  html = html.replace(/^[\*\-] \[([ x])\] (.+)$/gm, (_, checked, text) => {
    const attr = checked === 'x' ? ' checked' : ''
    return `\x00TASKLI\x00${attr}\x00${text}\x00/TASKLI`
  })
  html = html.replace(/((?:\x00TASKLI.*\x00\/TASKLI\n?)+)/g, (m) => {
    return '<ul class="task-list">' + m.replace(/\x00TASKLI(\x00[^\x00]*)\x00(.+?)\x00\/TASKLI/g, (_, attr, text) => {
      return `<li class="task-list-item"><input type="checkbox"${attr} disabled>${text}</li>`
    }) + '</ul>'
  })

  // Unordered lists (skip already-processed task list items)
  html = html.replace(/^[\*\-] (.+)$/gm, '\x00ULI$1\x00/ULI')
  html = html.replace(/((?:\x00ULI.*\x00\/ULI\n?)+)/g, (m) => {
    return '<ul>' + m.replace(/\x00ULI(.+)\x00\/ULI/g, '<li>$1</li>') + '</ul>'
  })

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '\x00OLI$1\x00/OLI')
  html = html.replace(/((?:\x00OLI.*\x00\/OLI\n?)+)/g, (m) => {
    return '<ol>' + m.replace(/\x00OLI(.+)\x00\/OLI/g, '<li>$1</li>') + '</ol>'
  })

  // Tables — detect header row
  html = html.replace(/^\|(.+)\|$/gm, (row) => {
    const cells = row.split('|').filter(c => c.trim() !== '')
    if (cells.every(c => /^[\s\-:]+$/.test(c))) return '\x00SKIPROW\x00'
    return '\x00TR\x00' + cells.map(c => `\x00TD\x00${c.trim()}\x00/TD`).join('') + '\x00/TR'
  })
  // Mark row before separator as <th>
  html = html.replace(/\x00TR\x00(?:\x00TD\x00[^\x00]+\x00\/TD)+\x00\/TR\n\x00SKIPROW\x00/g, (m) => {
    return m
      .replace('\x00SKIPROW\x00', '')
      .replace(/\x00TR\x00/, '<tr class="table-header">')
      .replace(/\x00TD\x00/g, '<th>')
      .replace(/\x00\/TD/g, '</th>')
      .replace(/\x00\/TR/, '</tr>')
  })
  html = html.replace(/\x00SKIPROW\x00\n?/g, '')
  html = html.replace(/\x00TR\x00/g, '<tr>')
  html = html.replace(/\x00TD\x00/g, '<td>')
  html = html.replace(/\x00\/TD/g, '</td>')
  html = html.replace(/\x00\/TR/g, '</tr>')
  html = html.replace(/((?:<tr.*<\/tr>\n?)+)/g, '<div class="table-wrap"><table>$1</table></div>')

  // Paragraphs
  const lines = html.split('\n')
  const result: string[] = []
  let inP = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const isBlock = /^<(h[1-6]|ul|ol|div|table|blockquote|hr|pre|li|tr|\/|p)/.test(line) || line === ''

    if (isBlock) {
      if (inP) { result.push('</p>'); inP = false }
      result.push(lines[i])
    } else {
      if (!inP) { result.push('<p>'); inP = true }
      else result.push('<br>')
      result.push(line)
    }
  }
  if (inP) result.push('</p>')

  html = result.join('\n')

  // Restore inline code
  html = html.replace(/\x00INLINE(\d+)\x00/g, (_, i) => inlines[parseInt(i)])

  // Restore code blocks
  html = html.replace(/\x00BLOCK(\d+)\x00/g, (_, i) => blocks[parseInt(i)])

  return html
}
