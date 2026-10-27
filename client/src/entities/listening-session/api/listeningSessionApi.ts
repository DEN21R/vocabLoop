import { api } from '../../../shared/api/api'
import type { ListeningSession } from '../model/types'

export async function getSessions() {
  const response = await api.get<{ sessions: ListeningSession[] }>('/listening-sessions')
  return response.data
}

// При открытии сервер возвращает объекты слов вместо ID.
export async function getSession<TWord>(id: string) {
  const response = await api.get<{
    session: Omit<ListeningSession, 'words'> & { words: TWord[] }
  }>(`/listening-sessions/${id}`)
  return response.data
}
