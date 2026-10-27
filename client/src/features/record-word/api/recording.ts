import { api } from '../../../shared/api/api'

export async function saveRecording(wordId: string, audioBlob: Blob) {
  const response = await api.put(`/words/${wordId}/recording`, audioBlob, {
    headers: {
      'Content-Type': audioBlob.type,
    },
  })

  return response.data
}
export async function deleteRecording(wordId: string) {
  const response = await api.delete(`/words/${wordId}/recording`)
  return response.data
}
