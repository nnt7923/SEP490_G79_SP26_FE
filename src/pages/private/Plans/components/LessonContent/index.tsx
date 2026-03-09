import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

import { AlertTriangle, Info, Lightbulb, AlertCircle } from 'lucide-react'

interface LessonContentProps {
  content: string
  loading?: boolean
  error?: string | null
  isFocusMode?: boolean
}

const LessonContent: React.FC<LessonContentProps> = ({ content, loading, error, isFocusMode = false }) => {
  const [processedContent, setProcessedContent] = React.useState<string>(content)

  React.useEffect(() => {
    if (!content) return

    let processed = content

    // Find Common Mistakes section and extract code blocks, then render as a 3-column HTML table with multiline code blocks
    const commonMistakesRegex = /## Common Mistakes\n([\s\S]*?)(?=\n## |\n# |$)/
    const match = content.match(commonMistakesRegex)

    if (match) {
      const mistakesContent = match[1]
      
      // Extract all code blocks with positions
      const codeBlockRegex = /```([\w]*)\n([\s\S]*?)```/g
      const codeBlocks: Array<{ lang: string; code: string; start: number; end: number }> = []
      let codeMatch: RegExpExecArray | null
      
      while ((codeMatch = codeBlockRegex.exec(mistakesContent)) !== null) {
        codeBlocks.push({
          lang: codeMatch[1] || 'text',
          code: codeMatch[2],
          start: codeMatch.index,
          end: codeMatch.index + codeMatch[0].length,
        })
      }
      
      if (codeBlocks.length >= 2) {
        const escapeHtml = (s: string) =>
          s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')

        const escapeText = (s: string) =>
          s
            .replace(/<br\s*\/?\>/gi, '\n')
            .replace(/&nbsp;/gi, ' ')
            .trim()

        const rowsHtml: string[] = []
        for (let i = 0; i < codeBlocks.length; i += 2) {
          const left = codeBlocks[i]
          const right = codeBlocks[i + 1]
          if (!right) break

          const noteRaw = mistakesContent.slice(left.end, right.start)
          const noteEscaped = escapeHtml(escapeText(noteRaw)).replace(/\n/g, '<br/>')

          const leftCode = escapeHtml(left.code.trim())
          const rightCode = escapeHtml(right.code.trim())

          rowsHtml.push(`
<tr>
  <td><pre><code class="language-${left.lang}">${leftCode}</code></pre></td>
  <td><pre><code class="language-${right.lang}">${rightCode}</code></pre></td>
  <td><div>${noteEscaped}</div></td>
</tr>`)
        }

        const tableHtml = `## Common Mistakes\n\n<div class="table-breakout">\n<table>\n  <thead>\n    <tr>\n      <th>❌ Wrong Approach</th>\n      <th>✅ Correct Approach</th>\n      <th>📝 Notes</th>\n    </tr>\n  </thead>\n  <tbody>\n    ${rowsHtml.join('\n')}\n  </tbody>\n</table>\n</div>`

        processed = content.replace(commonMistakesRegex, tableHtml)
      }
    }

    setProcessedContent(processed)
  }, [content])

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-heading bg-[var(--gray-100)] px-4 py-3 border border-bd font-mono text-sm">
        <span className="font-bold text-status-blue">{'>_'}</span>
        <span className="font-medium inline-block relative pr-3">
          loading_lesson_content()
          <span className="absolute right-0 top-0 bottom-0 w-2 bg-status-blue-solid animate-[blink_1s_step-end_infinite]"></span>
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-status-red-dark bg-[var(--gray-100)] px-4 py-3 border border-red-300 font-mono text-sm">
        <div className="flex items-start gap-2">
          <span className="font-bold">{'>_'}</span>
          <span className="font-medium">[ERROR]: {error}</span>
        </div>
      </div>
    )
  }

  if (!content || content.trim().length === 0) {
    return (
      <div className="text-muted text-center py-8 bg-[var(--gray-100)] border border-dashed border-bd-strong font-mono text-sm">
        <p className="font-medium">// no_content_found_for_selected_lesson</p>
      </div>
    )
  }

  return (
    <div className="lesson-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold font-mono text-heading mb-6 mt-8 pb-4 border-b border-bd">
              {children}
            </h1>
          ),
          h2: ({ children }) => {
            const id = children?.toString().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
            return (
              <h2 id={id} className="lesson-h2 text-2xl font-bold font-mono text-heading mb-4 mt-8 pb-3 border-b border-bd-muted flex items-center gap-2">
                {children}
              </h2>
            )
          },
          h3: ({ children }) => {
            const id = children?.toString().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
            return (
              <h3 id={id} className="lesson-h3 text-xl font-bold font-mono text-heading mb-3 mt-6 pb-2 border-b border-bd-subtle flex items-center gap-2">
                {children}
              </h3>
            )
          },
          h4: ({ children }) => (
            <h4 className="text-lg font-semibold font-mono text-heading mb-3 mt-5 flex items-center gap-2">
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-base font-semibold font-mono text-heading mb-2 mt-4">
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-sm font-semibold font-mono text-body mb-2 mt-3 uppercase tracking-wide">
              {children}
            </h6>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p className="text-heading leading-relaxed mb-5 text-base font-mono">
              {children}
            </p>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="space-y-2 mb-5 ml-2 text-heading font-mono">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-2 mb-5 ml-6 text-heading font-mono list-decimal">
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => {
            const isTaskList = props.className?.includes('task-list-item')
            
            if (isTaskList) {
              return (
                <li className="flex items-start gap-2 leading-relaxed list-none" {...props}>
                  {children}
                </li>
              )
            }
            
            return (
              <li className="leading-relaxed relative pl-5 text-base" {...props}>
                <span className="absolute left-0 top-0 text-status-blue-muted">{'*'}</span>
                <span>{children}</span>
              </li>
            )
          },

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-status-blue hover:text-status-blue-dark hover:underline"
            >
              {children}
            </a>
          ),

          // Blockquotes
          blockquote: ({ children }) => {
            const textContent = React.Children.toArray(children).map((child: any) => 
               child?.props?.children || ''
            ).join(' ')
            
            // Github Alert Syntax matching
            let type = 'info'
            let title = 'NOTE'
            let icon = <Info className="w-4 h-4" />
            
            if (textContent.includes('[!WARNING]')) { type = 'warning'; title = 'WARNING'; icon = <AlertTriangle className="w-4 h-4" /> }
            else if (textContent.includes('[!IMPORTANT]')) { type = 'important'; title = 'IMPORTANT'; icon = <Lightbulb className="w-4 h-4" /> }
            else if (textContent.includes('[!CAUTION]')) { type = 'error'; title = 'CAUTION'; icon = <AlertCircle className="w-4 h-4" /> }

            const colorVar = 
              type === 'warning' ? 'var(--warning-primary)' :
              type === 'important' ? 'var(--accent-purple)' :
              type === 'error' ? 'var(--error-primary)' :
              'var(--accent-primary)'

            const bgVar = 
              type === 'warning' ? 'var(--warning-primary-muted)' :
              type === 'important' ? 'var(--accent-purple-muted)' :
              type === 'error' ? 'var(--error-primary-muted)' :
              'var(--bg-active)'

            // Only style as an alert if it MATCHES a known format
            const hasAlert = ['[!NOTE]', '[!WARNING]', '[!IMPORTANT]', '[!CAUTION]', '[!TIP]'].some(a => textContent.includes(a))

            if (hasAlert) {
              return (
                <div style={{
                  background: bgVar, border: `1px solid ${colorVar}`, borderLeft: `4px solid ${colorVar}`,
                  padding: '16px', margin: '24px 0', borderRadius: '4px', fontFamily: 'monospace'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: colorVar, fontWeight: 700, marginBottom: 8, fontSize: 13 }}>
                    {icon} [{title}]
                  </div>
                  <div style={{ color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.6 }}>
                    {React.Children.map(children, (child: any) => {
                       // filter out the literal [!NOTE] strings from rendering
                       if (typeof child?.props?.children === 'string') {
                          return React.cloneElement(child, { 
                            children: child.props.children.replace(/\[!(NOTE|WARNING|IMPORTANT|CAUTION|TIP)\]/g, '') 
                          })
                       }
                       if (Array.isArray(child?.props?.children)) {
                         return React.cloneElement(child, {
                            children: child.props.children.map((c: any) => 
                              typeof c === 'string' ? c.replace(/\[!(NOTE|WARNING|IMPORTANT|CAUTION|TIP)\]/g, '') : c
                            )
                         })
                       }
                       return child
                    })}
                  </div>
                </div>
              )
            }

            // Default blockquote
            return (
              <blockquote className="border border-bd bg-[var(--gray-100)] pl-4 pr-4 py-3 my-6 text-body font-mono relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-th-skeleton"></div>
                <div className="flex gap-3">
                  <span className="text-placeholder select-none">|</span>
                  <div className="flex-1 text-heading">{children}</div>
                </div>
              </blockquote>
            )
          },

          // Code blocks
          code: ({ inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''

            if (!inline && language) {
              return (
                <div className="my-4 border border-bd font-mono text-sm">
                  <div className="flex items-center justify-between bg-[var(--gray-100)] px-3 py-1.5 border-b border-bd">
                    <span className="text-xs font-bold text-label lowercase">
                      {language}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(String(children).replace(/\n$/, ''))
                      }}
                      className="text-xs text-muted hover:text-black hover:bg-th-hover transition-colors px-2 py-0.5"
                      title="Copy code"
                    >
                      [copy]
                    </button>
                  </div>
                  <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={language}
                    PreTag="div"
                    showLineNumbers={true}
                    customStyle={{
                      margin: 0,
                      borderRadius: 0,
                      fontSize: '0.875rem',
                      lineHeight: '1.6',
                      padding: '1rem',
                      background: 'var(--code-block-bg)',
                    }}
                    lineNumberStyle={{
                      minWidth: '2.5em',
                      paddingRight: '1em',
                      color: 'var(--text-muted-mid)',
                      opacity: 0.5,
                      userSelect: 'none',
                    }}
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                </div>
              )
            }

            // Inline code (neutral)
            return (
              <code
                className="bg-[var(--gray-100)] text-heading px-1.5 py-0.5 text-sm font-mono border border-bd mx-1"
                {...props}
              >
                {children}
              </code>
            )
          },

          // Tables (neutral styles)
          table: ({ children }) => (
            <div className="table-breakout overflow-x-auto my-6">
              <table className="min-w-full text-sm font-mono border border-bd-strong">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[var(--code-block-bg)] text-white">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="bg-th-card">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="border-b border-bd">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left font-semibold border-r border-bd-input last:border-r-0">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 align-top border-r border-bd last:border-r-0 text-heading">{children}</td>
          ),

          // Horizontal rule
          hr: () => (
            <hr className="my-8 border-t-2 border-dashed border-bd" />
          ),

          // Images
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt || ''}
              className="max-w-full h-auto my-6 border-2 border-bd"
            />
          ),

          // Strong/Bold
          strong: ({ children }) => (
            <strong className="font-bold text-heading">{children}</strong>
          ),

          // Emphasis/Italic
          em: ({ children }) => (
            <em className="italic text-heading">{children}</em>
          ),

          // Handle unknown HTML tags (like <subject>) - render as span
          // @ts-expect-error Custom element not in basic typings
          subject: ({ children }: any) => (
            <span className="inline">{children}</span>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
      
      <style>{`
        .lesson-content {
          counter-reset: h2-counter;
        }

        ${isFocusMode ? `
        .lesson-content > *:not(.table-breakout) {
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
        }
        .lesson-content .table-breakout {
          width: 100%;
          max-width: 100%;
        }
        ` : `
        .lesson-content .table-breakout {
          width: 100%;
        }
        `}

        .lesson-h2 {
          counter-increment: h2-counter;
          counter-reset: h3-counter;
        }
        .lesson-h2::before {
          content: counter(h2-counter) ". ";
          color: var(--accent-primary);
        }
        .lesson-h3 {
          counter-increment: h3-counter;
        }
        .lesson-h3::before {
          content: counter(h2-counter) "." counter(h3-counter) " ";
          color: var(--accent-primary);
        }
      `}</style>
    </div>
  )
}

export default LessonContent
