import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

import { AlertTriangle, Info, Lightbulb, AlertCircle, Loader2, Copy } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface LessonContentProps {
  content: string
  loading?: boolean
  error?: string | null
  isFocusMode?: boolean
}

const SECTION_KEYS = [
  'overview',
  'core-concepts',
  'code-examples',
  'common-mistakes',
  'best-practices',
  'summary',
] as const

type LessonSectionKey = (typeof SECTION_KEYS)[number]

const HEADING: Record<LessonSectionKey, string> = {
  overview: '## Overview',
  'core-concepts': '## Core Concepts',
  'code-examples': '## Code Examples',
  'common-mistakes': '## Common Mistakes',
  'best-practices': '## Best Practices',
  summary: '## Summary',
}

const ORDER: LessonSectionKey[] = [
  'overview',
  'core-concepts',
  'code-examples',
  'common-mistakes',
  'best-practices',
  'summary',
]

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const extractSectionByMarkers = (markdown: string, key: LessonSectionKey): string => {
  const start = `<!-- SECTION:${key}:start -->`
  const end = `<!-- SECTION:${key}:end -->`

  const startIndex = markdown.indexOf(start)
  const endIndex = markdown.indexOf(end)

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) return ''

  return markdown.slice(startIndex + start.length, endIndex).trim()
}

const extractSectionByHeading = (markdown: string, heading: string): string => {
  const pattern = new RegExp(`^${escapeRegExp(heading)}\\s*\\n([\\s\\S]*?)(?=^##\\s|\\Z)`, 'im')
  const match = markdown.match(pattern)
  return match ? match[1].trim() : ''
}

const normalizeSectionContent = (section: string, key: LessonSectionKey): string => {
  const heading = HEADING[key]
  const pattern = new RegExp(`^${escapeRegExp(heading)}\\s*\\n+`, 'i')
  return section.replace(pattern, '').trim()
}

const parseLessonContent = (markdown: string) => {
  const hasAnyMarker = SECTION_KEYS.some((key) =>
    markdown.includes(`<!-- SECTION:${key}:start -->`)
  )

  const sections = {} as Record<LessonSectionKey, string>
  SECTION_KEYS.forEach((key) => {
    const markerContent = hasAnyMarker ? extractSectionByMarkers(markdown, key) : ''
    if (markerContent) {
      sections[key] = normalizeSectionContent(markerContent, key)
      return
    }

    sections[key] = extractSectionByHeading(markdown, HEADING[key])
  })

  const hasAnySection = SECTION_KEYS.some((key) => sections[key]?.trim())
  return { sections, hasAnySection }
}

type ParsedCommonMistake = {
  title: string
  wrongCode: string
  correctCode: string
  wrongLang?: string
  correctLang?: string
}

const parseCommonMistakes = (sectionMarkdown: string): ParsedCommonMistake[] => {
  const pattern =
    /####\s*Mistake\s+\d+\s*:\s*(.+?)\s*\n\*\*Wrong\*\*\s*\n```([\w#+.-]*)\n([\s\S]*?)\n```\s*\n\*\*Correct\*\*\s*\n```([\w#+.-]*)\n([\s\S]*?)\n```/gi

  const items: ParsedCommonMistake[] = []
  let match: RegExpExecArray | null

  while ((match = pattern.exec(sectionMarkdown)) !== null) {
    items.push({
      title: match[1].trim(),
      wrongLang: match[2]?.trim() || undefined,
      wrongCode: match[3].trim(),
      correctLang: match[4]?.trim() || undefined,
      correctCode: match[5].trim(),
    })
  }

  return items
}

const buildCommonMistakesTable = (items: ParsedCommonMistake[]) => {
  const rows = items.map((item, index) => {
    const title = escapeHtml(item.title || `Mistake ${index + 1}`)
    const wrong = escapeHtml(item.wrongCode)
    const correct = escapeHtml(item.correctCode)
    const wrongLang = escapeHtml(item.wrongLang || 'text')
    const correctLang = escapeHtml(item.correctLang || item.wrongLang || 'text')

    return [
      '<tr>',
      `  <td><strong>${title}</strong></td>`,
      `  <td><pre><code class="language-${wrongLang}">${wrong}</code></pre></td>`,
      `  <td><pre><code class="language-${correctLang}">${correct}</code></pre></td>`,
      '</tr>',
    ].join('\n')
  })

  return [
    '## Common Mistakes',
    '',
    '<div class="table-breakout">',
    '<table>',
    '  <thead>',
    '    <tr>',
    '      <th>Mistake</th>',
    '      <th>Wrong</th>',
    '      <th>Correct</th>',
    '    </tr>',
    '  </thead>',
    '  <tbody>',
    rows.join('\n'),
    '  </tbody>',
    '</table>',
    '</div>',
  ].join('\n')
}

const buildDisplayMarkdown = (sections: Record<LessonSectionKey, string>) => {
  const commonMistakes = sections['common-mistakes']?.trim()
  const commonMistakeItems = commonMistakes ? parseCommonMistakes(commonMistakes) : []

  return ORDER.map((key) => {
    const content = sections[key]?.trim()
    if (!content) return null

    if (key === 'common-mistakes' && commonMistakeItems.length > 0) {
      return buildCommonMistakesTable(commonMistakeItems)
    }

    return `${HEADING[key]}\n\n${content}`
  })
    .filter(Boolean)
    .join('\n\n')
}

const LessonContent: React.FC<LessonContentProps> = ({ content, loading, error, isFocusMode = false }) => {
  const { t } = useTranslation('student')
  const [processedContent, setProcessedContent] = React.useState<string>(content)

  React.useEffect(() => {
    if (!content) return

    const { sections, hasAnySection } = parseLessonContent(content)
    const processed = hasAnySection ? buildDisplayMarkdown(sections) : content

    setProcessedContent(processed)
  }, [content])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--accent-primary)]">
          <Loader2 className="w-5 h-5 animate-spin" />
          {t('lessonDetail.loadingContent', 'Loading lesson content...')}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 my-6 bg-[var(--error-primary-muted)] border border-[var(--danger-primary)] rounded-md text-sm font-medium text-[var(--danger-primary)]">
        <AlertCircle className="w-5 h-5" />
        {error}
      </div>
    )
  }

  if (!content || content.trim().length === 0) {
    return (
      <div className="flex justify-center items-center py-12 my-6 bg-[var(--bg-surface)] border border-dashed border-[var(--border-base)] rounded-md text-sm font-medium text-[var(--text-secondary)]">
        {t('lessonDetail.noContent', 'No content found for this lesson.')}
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
                <span className="absolute left-1 top-2.5 w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]"></span>
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
              <blockquote className="border border-[var(--border-base)] bg-[var(--bg-surface)] pl-4 pr-4 py-3 my-6 text-body font-mono relative rounded-r-md" style={{ borderLeft: '4px solid var(--border-strong)' }}>
                <div className="flex gap-3">
                  <div className="flex-1 text-heading opacity-90">{children}</div>
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
                      className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors px-2 py-1 flex items-center gap-1 bg-transparent border-none cursor-pointer"
                      title="Copy code"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy
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
