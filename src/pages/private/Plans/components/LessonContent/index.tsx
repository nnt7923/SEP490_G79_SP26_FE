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
      <div className="flex items-center gap-3 text-gray-800 bg-[var(--gray-100)] px-4 py-3 border border-gray-300 font-mono text-sm">
        <span className="font-bold text-blue-600">{'>_'}</span>
        <span className="font-medium inline-block relative pr-3">
          loading_lesson_content()
          <span className="absolute right-0 top-0 bottom-0 w-2 bg-blue-600 animate-[blink_1s_step-end_infinite]"></span>
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-700 bg-[var(--gray-100)] px-4 py-3 border border-red-300 font-mono text-sm">
        <div className="flex items-start gap-2">
          <span className="font-bold">{'>_'}</span>
          <span className="font-medium">[ERROR]: {error}</span>
        </div>
      </div>
    )
  }

  if (!content || content.trim().length === 0) {
    return (
      <div className="text-gray-500 text-center py-8 bg-[var(--gray-100)] border border-dashed border-gray-400 font-mono text-sm">
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
            <h1 className="text-3xl font-bold font-mono text-gray-900 mb-6 mt-8 pb-4 border-b border-gray-300">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-bold font-mono text-gray-900 mb-4 mt-8 pb-3 border-b border-gray-200 flex items-center gap-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-bold font-mono text-gray-900 mb-3 mt-6 pb-2 border-b border-gray-100 flex items-center gap-2">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-lg font-semibold font-mono text-gray-800 mb-3 mt-5 flex items-center gap-2">
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-base font-semibold font-mono text-gray-800 mb-2 mt-4">
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-sm font-semibold font-mono text-gray-700 mb-2 mt-3 uppercase tracking-wide">
              {children}
            </h6>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p className="text-gray-900 leading-relaxed mb-5 text-base font-mono">
              {children}
            </p>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="space-y-2 mb-5 ml-2 text-gray-900 font-mono">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-2 mb-5 ml-6 text-gray-900 font-mono list-decimal">
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
                <span className="absolute left-0 top-0 text-blue-500">{'*'}</span>
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
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              {children}
            </a>
          ),

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border border-gray-300 bg-[var(--gray-100)] pl-4 pr-4 py-3 my-6 text-gray-700 font-mono relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-400"></div>
              <div className="flex gap-3">
                <span className="text-gray-400 select-none">|</span>
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
                <div className="my-4 border border-gray-300 font-mono text-sm">
                  <div className="flex items-center justify-between bg-[var(--gray-100)] px-3 py-1.5 border-b border-gray-300">
                    <span className="text-xs font-bold text-gray-600 lowercase">
                      {language}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(String(children).replace(/\n$/, ''))
                      }}
                      className="text-xs text-gray-500 hover:text-black hover:bg-gray-200 transition-colors px-2 py-0.5"
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
                      background: 'var(--text-primary)', // keeping dark background for code specifically for syntax highlighting visibility
                    }}
                    lineNumberStyle={{
                      minWidth: '2.5em',
                      paddingRight: '1em',
                      color: 'var(--color-hex-97)',
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
                className="bg-[var(--gray-100)] text-gray-900 px-1.5 py-0.5 text-sm font-mono border border-gray-300 mx-1"
                {...props}
              >
                {children}
              </code>
            )
          },

          // Tables (neutral styles)
          table: ({ children }) => (
            <div className="overflow-x-auto my-6">
              <table className="min-w-full text-sm font-mono border border-gray-400">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[var(--text-primary)] text-white">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="bg-white">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="border-b border-gray-300">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left font-semibold border-r border-gray-500 last:border-r-0">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 align-top border-r border-gray-300 last:border-r-0 text-gray-800">{children}</td>
          ),

          // Horizontal rule
          hr: () => (
            <hr className="my-8 border-t-2 border-dashed border-gray-300" />
          ),

          // Images
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt || ''}
              className="max-w-full h-auto my-6 border-2 border-gray-300"
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
          // @ts-expect-error Custom element not in basic typings
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
