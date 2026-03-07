import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface LessonContentProps {
  content: string
  loading?: boolean
  error?: string | null
}

const LessonContent: React.FC<LessonContentProps> = ({ content, loading, error }) => {
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

        const tableHtml = `## Common Mistakes\n\n<table>\n  <thead>\n    <tr>\n      <th>❌ Wrong Approach</th>\n      <th>✅ Correct Approach</th>\n      <th>📝 Notes</th>\n    </tr>\n  </thead>\n  <tbody>\n    ${rowsHtml.join('\n')}\n  </tbody>\n</table>`

        processed = content.replace(commonMistakesRegex, tableHtml)
      }
    }

    setProcessedContent(processed)
  }, [content])

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-gray-600 bg-blue-50 px-4 py-3 rounded-xl border-2 border-blue-200">
        <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="font-medium">Loading lesson content…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-700 bg-red-50 px-4 py-3 rounded-xl border-2 border-red-200">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-medium">{error}</span>
        </div>
      </div>
    )
  }

  if (!content || content.trim().length === 0) {
    return (
      <div className="text-gray-500 text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
        <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="font-medium">No content for the selected lesson/chapter.</p>
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
            <h1 className="text-4xl font-bold font-heading text-gray-900 mb-6 mt-8 pb-4 border-b-2 border-gray-200">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-3xl font-bold font-heading text-gray-900 mb-4 mt-8 pb-3 border-b-2 border-gray-100">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-2xl font-bold font-heading text-gray-900 mb-3 mt-6 pb-2 border-b border-gray-200">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xl font-semibold font-heading text-gray-800 mb-3 mt-5">
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-lg font-semibold font-heading text-gray-800 mb-2 mt-4">
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-base font-semibold font-heading text-gray-700 mb-2 mt-3">
              {children}
            </h6>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p className="text-gray-800 leading-relaxed mb-5 text-base">
              {children}
            </p>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="space-y-3 mb-5 ml-6 text-gray-800">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-3 mb-5 ml-6 text-gray-800">
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
              <li className="leading-relaxed relative pl-2 text-base" {...props}>
                <span className="absolute left-0 top-2 w-2 h-2 rounded-full bg-gray-400" />
                <span className="ml-3">{children}</span>
              </li>
            )
          },

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              {children}
            </a>
          ),

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 bg-gray-50 pl-5 pr-4 py-4 my-6 italic text-gray-700 rounded-r">
              <div className="flex gap-3">
                <svg className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <div className="flex-1">{children}</div>
              </div>
            </blockquote>
          ),

          // Code blocks
          code: ({ inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''

            if (!inline && language) {
              return (
                <div className="my-3 rounded border border-gray-200">
                  <div className="flex items-center justify-between bg-gray-800 px-3 py-1.5 border-b border-gray-700">
                    <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                      {language}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(String(children).replace(/\n$/, ''))
                      }}
                      className="text-xs text-gray-300 hover:text-white transition-colors px-2 py-0.5 rounded hover:bg-gray-700"
                      title="Copy code"
                    >
                      Copy
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
                      padding: '0.75rem',
                      background: '#1e1e1e',
                    }}
                    lineNumberStyle={{
                      minWidth: '3em',
                      paddingRight: '1em',
                      color: '#858585',
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
                className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-sm font-mono border border-gray-200"
                {...props}
              >
                {children}
              </code>
            )
          },

          // Tables (neutral styles)
          table: ({ children }) => (
            <table className="min-w-full text-sm border border-gray-200 my-4">
              {children}
            </table>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody>
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr>{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-semibold text-gray-800 border-b border-gray-200">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 align-top text-gray-800 border-b border-gray-200">{children}</td>
          ),

          // Horizontal rule
          hr: () => (
            <hr className="my-6 border-t border-gray-200" />
          ),

          // Images
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt || ''}
              className="max-w-full h-auto my-4 border border-gray-200 rounded"
            />
          ),

          // Strong/Bold
          strong: ({ children }) => (
            <strong className="font-bold text-gray-900">{children}</strong>
          ),

          // Emphasis/Italic
          em: ({ children }) => (
            <em className="italic text-gray-800">{children}</em>
          ),

          // Handle unknown HTML tags (like <subject>) - render as span
          subject: ({ children }: any) => (
            <span className="inline">{children}</span>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}

export default LessonContent
