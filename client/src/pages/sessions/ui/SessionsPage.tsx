import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Box, Button, Typography } from '@mui/material'
import {
  getSessions,
  deleteSession,
  type ListeningSession,
} from '../../../entities/listening-session'

function SessionsPage() {
  const [sessions, setSessions] = useState<ListeningSession[]>([])
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  )
  const [attempt, setAttempt] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')

  async function handleDelete(session: ListeningSession) {
    if (deletingId || !window.confirm(`Удалить сессию «${session.name}»? Слова и записи останутся в словаре.`)) return
    setDeletingId(session._id)
    setDeleteError('')
    try {
      await deleteSession(session._id)
      setSessions((current) => current.filter((item) => item._id !== session._id))
    } catch {
      setDeleteError('Не удалось удалить сессию. Попробуйте ещё раз.')
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    let cancelled = false
    getSessions()
      .then((result) => {
        if (cancelled) return
        setSessions(result.sessions)
        setStatus('success')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  return (
    <Box>
      <Typography variant="h4">Мои сессии</Typography>
      <Button component={Link} to="/user/home">
        Выбрать слова и создать сессию
      </Button>
      {status === 'loading' && <Typography>Загрузка…</Typography>}
      {status === 'error' && (
        <Box>
          <Typography color="error">Не удалось загрузить сессии</Typography>
          <Button
            onClick={() => {
              setStatus('loading')
              setAttempt((value) => value + 1)
            }}
          >
            Повторить
          </Button>
        </Box>
      )}
      {status === 'success' && sessions.length === 0 && (
        <Typography>Пока нет сессий</Typography>
      )}
      {deleteError && <Typography color="error" role="alert">{deleteError}</Typography>}
      {status === 'success' &&
        sessions.map((session) => (
          <Box key={session._id} sx={{ my: 2 }}>
            <Link to={`/user/sessions/${session._id}`}>{session.name}</Link>
            <Typography>{session.words.length} слов</Typography>
            <Button color="error" disabled={deletingId !== null} onClick={() => { void handleDelete(session) }}>
              {deletingId === session._id ? 'Удаляем…' : 'Удалить сессию'}
            </Button>
          </Box>
        ))}
    </Box>
  )
}
export default SessionsPage
