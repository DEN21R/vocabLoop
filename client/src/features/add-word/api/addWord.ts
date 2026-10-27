import { api } from '../../../shared/api/api'
import { type IWord } from '../../../entities/word/'

export interface IAddWordRequest {
  original: string
  sourceLanguage: string
  targetLanguage: string
}
export interface IWordResponse {
  word: IWord
}
export async function addWord(word: IAddWordRequest) {
  const response = await api.post<IWordResponse>('/words', word)
  return response.data
}
