import React from 'react'
import ReactMarkdown from 'react-markdown'
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

    // Find Common Mistakes section and extract code blocks
    const commonMistakesRegex = /## Common Mistakes\n([\s\S]*?)(?=\n## |\n# |$)/
    const match = content.match(commonMistakesRegex)

    if (match) {
      const mistakesContent = match[1]
      
      // Extract all code blocks
      const codeBlockRegex = /```([\w]*)\n([\s\S]*?)```/g
      const codeBlocks: Array<{ lang: string; code: string }> = []
      let codeMatch
      
      while ((codeMatch = codeBlockRegex.exec(mistakesContent)) !== null) {
        codeBlocks.push({
          lang: codeMatch[1] || 'text',
          code: codeMatch[2]
        })
      }
      
      if (codeBlocks.length >= 2) {
        // Create formatted section with 2-column layout
        const formattedMistakes = `## Common Mistakes

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin: 1.5rem 0;">
  <div style="border: 2px solid #ef4444; border-radius: 0.75rem; overflow: hidden;">
    <div style="background: #fee2e2; padding: 0.75rem 1rem; border-bottom: 2px solid #ef4444;">
      <strong style="color: #991b1b; font-size: 0.95rem;">❌ Wrong Code</strong>
    </div>
    <div style="padding: 0;">

\`\`\`${codeBlocks[0].lang}
${codeBlocks[0].code.trim()}
\`\`\`

    </div>
  </div>
  <div style="border: 2px solid #22c55e; border-radius: 0.75rem; overflow: hidden;">
    <div style="background: #dcfce7; padding: 0.75rem 1rem; border-bottom: 2px solid #22c55e;">
      <strong style="color: #166534; font-size: 0.95rem;">✅ Correct Code</strong>
    </div>
    <div style="padding: 0;">

\`\`\`${codeBlocks[1].lang}
${codeBlocks[1].code.trim()}
\`\`\`

    </div>
  </div>
</div>`

        processed = content.replace(commonMistakesRegex, formattedMistakes)
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
        <span className="font-medium">Loading content…</span>
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
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-4xl font-bold font-heading text-gray-900 mb-6 mt-8 pb-4 border-b-2 border-blue-300">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-3xl font-bold font-heading text-gray-900 mb-4 mt-8 pb-3 border-b-2 border-blue-200">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-2xl font-bold font-heading text-gray-900 mb-3 mt-6 pb-2 border-b border-gray-300">
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
            <p className="text-gray-700 leading-relaxed mb-5 text-base">
              {children}
            </p>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="space-y-3 mb-5 ml-6 text-gray-700">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-3 mb-5 ml-6 text-gray-700">
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
                <span className="absolute left-0 top-2 w-2 h-2 rounded-full bg-blue-500" />
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
              className="text-blue-600 hover:text-blue-700 underline font-medium transition-colors"
            >
              {children}
            </a>
          ),

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 pl-5 pr-4 py-4 my-6 italic text-gray-700 rounded-r-xl shadow-sm">
              <div className="flex gap-3">
                <svg className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 24 24">
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
                <div className="my-6 rounded-xl overflow-hidden border-2 border-gray-300 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 px-4 py-2.5 border-b border-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                      </div>
                      <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide ml-2">
                        {language}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(String(children).replace(/\n$/, ''))
                      }}
                      className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-700 font-medium"
                      title="Copy code"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
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
                      padding: '1.25rem',
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

            // Inline code
            return (
              <code
                className="bg-pink-50 text-pink-700 px-2 py-0.5 rounded-md text-sm font-mono border border-pink-200 font-semibold"
                {...props}
              >
                {children}
              </code>
            )
          },

          // Tables
          table: ({ children }) => (
            <div className="my-6 overflow-x-auto rounded-xl border-2 border-gray-200 shadow-md">
              <table className="min-w-full divide-y divide-gray-200">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gradient-to-r from-blue-500 to-purple-500">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="bg-white divide-y divide-gray-200">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-blue-50 transition-colors">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-6 py-4 text-sm text-gray-700 font-medium">{children}</td>
          ),

          // Horizontal rule
          hr: () => (
            <hr className="my-6 border-t-2 border-gray-200" />
          ),

          // Images
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt || ''}
              className="max-w-full h-auto rounded-xl shadow-md my-4 border-2 border-gray-200"
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
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}

export default LessonContent
