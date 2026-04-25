import { describe, expect, it } from 'vitest'
import { resolveShareToStudentErrorMessage } from './shareErrorMessage'

describe('resolveShareToStudentErrorMessage', () => {
  const t = (key: string) => key

  it('maps share reception limit message to i18n key', () => {
    const result = resolveShareToStudentErrorMessage(
      {
        response: {
          data: {
            message: 'The student has reached their share reception limit for this subscription.',
          },
        },
      },
      t,
      'fallback',
    )

    expect(result).toBe('chat.shareReceptionLimitReached')
  })

  it('maps share reception limit error code to i18n key', () => {
    const result = resolveShareToStudentErrorMessage(
      {
        response: {
          data: {
            errorCode: 'STUDENT_SHARE_RECEPTION_LIMIT_REACHED',
          },
        },
      },
      t,
      'fallback',
    )

    expect(result).toBe('chat.shareReceptionLimitReached')
  })
})
