import { api } from '../../../shared/api/api'
import type { ListeningSession, SessionInput } from '../../../entities/listening-session'

export async function updateSession(id: string, data: SessionInput) {
  const response = await api.patch<{ session: ListeningSession }>(`/listening-sessions/${id}`, data)
  return response.data
}
