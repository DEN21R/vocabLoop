import { api } from '../../../shared/api/api'

export async function getRecording(wordId: string) {
  const response = await api.get<Blob>(`/words/${wordId}/recording`, {
    responseType: 'blob',
  })

  return response.data
}
