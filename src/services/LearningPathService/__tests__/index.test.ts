import { describe, it, expect, vi, beforeEach } from 'vitest'

import api from '../../Axios'
import { generateSkeleton, generateLessonContent } from '../index'

describe('LearningPathService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('generateSkeleton builds correct body and unwraps ApiEnvelope', async () => {
    const skeleton = { lessons: [{ id: 'L1', title: 'Intro' }] }
    const postSpy = vi.spyOn(api as any, 'post').mockResolvedValue({ data: { value: skeleton } })

    const result = await generateSkeleton({
      subjectIds: ['S1'],
      goals: [{ goalId: 'G1', durationDay: 14, description: 'Desc' }],
    })

    expect(result).toEqual(skeleton)
    expect(postSpy).toHaveBeenCalledTimes(1)
    const [url, body] = (postSpy as any).mock.calls[0]
    expect(url).toBe('/learningpaths')
    expect(body).toMatchObject({
      SubjectIds: ['S1'],
      SubjectId: 'S1',
      GoalIds: ['G1'],
      GoalId: 'G1',
      Goals: [
        { GoalId: 'G1', DurationDay: 14, Description: 'Desc' },
      ],
    })
  })

  it('generateLessonContent posts to correct URL and unwraps', async () => {
    const lesson = { id: 'LS1', title: 'Lesson Title' }
    const postSpy = vi.spyOn(api as any, 'post').mockResolvedValue({ data: { value: lesson } })

    const result = await generateLessonContent('LS1', {
      subjectIds: ['S1'],
      goalIds: ['G1'],
    })

    expect(result).toEqual(lesson)
    expect(postSpy).toHaveBeenCalledTimes(1)
    const [url, body] = (postSpy as any).mock.calls[0]
    expect(url).toBe('/learningpaths/lessons/LS1/content')
    expect(body).toEqual({ SubjectIds: ['S1'], GoalIds: ['G1'] })
  })
})