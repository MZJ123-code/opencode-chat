import React, { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import mermaid from 'mermaid'
import type { Components } from 'react-markdown'

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
})

function MermaidBlock({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.removeAttribute('data-processed')
      mermaid.run({ nodes: [ref.current] })
    }
  }, [code])

  return (
    <div className="mermaid" ref={ref}>
      {code}
    </div>
  )
}

function handleCopy(e: React.MouseEvent<HTMLButtonElement>) {
  const btn = e.currentTarget
  const code = decodeURIComponent(btn.getAttribute('data-code') || '')
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = 'Copied!'
    btn.classList.add('copied')
    setTimeout(() => {
      btn.textContent = 'Copy'
      btn.classList.remove('copied')
    }, 2000)
  })
}

const components: Components = {
  pre({ children, ...props }) {
    const child = Array.isArray(children) ? children[0] : children
    const codeContent = child && typeof child === 'object' && 'props' in child
      ? String(child.props?.children || '').replace(/\n$/, '')
      : ''
    const lang = child && typeof child === 'object' && 'props' in child
      ? String(child.props?.className || '').replace(/^language-/, '')
      : ''

    if (lang === 'mermaid') {
      return <MermaidBlock code={codeContent} />
    }

    if (child && typeof child === 'object' && 'props' in child && child.props?.className !== undefined) {
      const encoded = encodeURIComponent(codeContent)
      return (
        <div className="code-block-wrap">
          <div className="code-block-header">
            <span className="code-lang-badge">{lang || 'code'}</span>
            <button className="code-copy-btn" data-code={encoded} onClick={handleCopy}>
              Copy
            </button>
          </div>
          <pre>{children}</pre>
        </div>
      )
    }

    return <pre {...props}>{children}</pre>
  },
}

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null

  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
