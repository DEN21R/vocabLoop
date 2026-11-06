import { api } from '../../../shared/api/api'
import { type IWord } from '../model/types'

export interface IWordResponse {
  words: IWord[]
  nextCursor?: string | null
}

export interface WordStatistics {
  total: number
  learned: number
  learnedEnglish: number
  learnedGerman: number
}

export async function getWordStatistics(signal?: AbortSignal) {
  const response = await api.get<WordStatistics>('/words/statistics', { signal })
  return response.data
}

export async function getWords(page?: { cursor?: string; search?: string; session?: 'all' | 'in' | 'out' | 'learned' }, signal?: AbortSignal) {
  const response = await api.get<IWordResponse>('/words', {
    params: page ? { limit: 20, ...page } : undefined,
    signal,
  })
  return response.data
}

export async function updateWord(id: string, data: Pick<IWord, 'original' | 'translation'> | { isLearned: true }) {
  const response = await api.patch<{ word: IWord }>(`/words/${id}`, data)
  return response.data
}
