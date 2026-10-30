import { api } from '../../../shared/api/api'
import { type IWord } from '../model/types'

export interface IWordResponse {
  words: IWord[]
  nextCursor?: string | null
}

export async function getWords(page?: { cursor?: string; search?: string }, signal?: AbortSignal) {
  const response = await api.get<IWordResponse>('/words', {
    params: page ? { limit: 20, ...page } : undefined,
    signal,
  })
  return response.data
}
