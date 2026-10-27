import { api } from '../../../shared/api/api'
import { type IWord } from '../../../entities/word/'

export interface IWordResponse {
  word: IWord
}

export function deleteWord(wordId: string) {
  return api.delete(`/words/${wordId}`)
}
