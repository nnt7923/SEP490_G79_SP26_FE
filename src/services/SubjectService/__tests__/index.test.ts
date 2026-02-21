import { describe, it, expect, vi, beforeEach } from 'vitest'

import api from '../../Axios'
import { listSubjects } from '../index'

describe('SubjectService.listSubjects', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns array when API returns plain array', async () => {
    const payload = [{ id: 's1', name: 'Subject 1' }]
    vi.spyOn(api as any, 'get').mockResolvedValue(payload)
    const result = await listSubjects()
    expect(result).toEqual(payload)
  })

  it('returns array when API returns { value: [...] }', async () => {
    const payload = [{ id: 's1', name: 'Subject 1' }]
    vi.spyOn(api as any, 'get').mockResolvedValue({ value: payload })
    const result = await listSubjects()
    expect(result).toEqual(payload)
  })

  it('returns array when API returns { data: [...] }', async () => {
    const payload = [{ id: 's1', name: 'Subject 1' }]
    vi.spyOn(api as any, 'get').mockResolvedValue({ data: payload })
    const result = await listSubjects()
    expect(result).toEqual(payload)
  })

  it('returns array when API returns { data: { value: [...] } }', async () => {
    const payload = [{ id: 's1', name: 'Subject 1' }]
    vi.spyOn(api as any, 'get').mockResolvedValue({ data: { value: payload } })
    const result = await listSubjects()
    expect(result).toEqual(payload)
  })
})