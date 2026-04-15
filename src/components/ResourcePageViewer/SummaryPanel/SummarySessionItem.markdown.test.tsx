import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SummarySessionItem from './SummarySessionItem'
import type { SummarySession } from '../../../types/summary'

const createSuccessSession = (summary: string): SummarySession => ({
  id: 'session-1',
  summaryId: 'summary-1',
  resourceId: 'resource-1',
  startPage: 1,
  endPage: 3,
  status: 'success',
  summary,
  timestamp: Date.now(),
})

describe('SummarySessionItem markdown rendering', () => {
  it('renders markdown content as formatted HTML', () => {
    const session = createSuccessSession([
      '## Title',
      '',
      '- item 1',
      '- item 2',
      '',
      '`inline`',
      '',
      '| A | B |',
      '|---|---|',
      '| 1 | 2 |',
    ].join('\n'))

    const html = renderToStaticMarkup(
      <SummarySessionItem
        session={session}
        onRetry={vi.fn()}
        onDelete={vi.fn()}
        canDelete
      />,
    )

    expect(html).toContain('<h2')
    expect(html).toContain('<ul')
    expect(html).toContain('<table')
    expect(html).toContain('<code')
  })

  it('does not render raw html tags as executable markup', () => {
    const session = createSuccessSession('Safe content <script>alert("xss")</script>')

    const html = renderToStaticMarkup(
      <SummarySessionItem
        session={session}
        onRetry={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(html).not.toContain('<script>alert("xss")</script>')
    expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
  })
})
