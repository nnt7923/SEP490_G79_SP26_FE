import api from '../Axios'
import { listSubjectsUrl } from './url'

export type Subject = {
  id: string
  name: string
  slug?: string
}

export async function listSubjects(): Promise<Subject[]> {
  const res: any = await api.get(listSubjectsUrl)
  return (res?.data ?? res) as Subject[]
}

export default { listSubjects }