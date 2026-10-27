import { api } from '../../../shared/api/api'
import { type IWord } from '../model/types'

export interface IWordResponse {
  words: IWord[]
}

export async function getWords() {
  const response = await api.get<IWordResponse>('/words')
  return response.data
}
