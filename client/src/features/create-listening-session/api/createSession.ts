import { api } from '../../../shared/api/api'
import type { ListeningSession, SessionInput } from '../../../entities/listening-session'

export async function createSession(data: SessionInput) {
  const response = await api.post<{ session: ListeningSession }>('/listening-sessions', data)
  return response.data
}
