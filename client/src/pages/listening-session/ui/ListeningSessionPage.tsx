import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Box, Button, Typography } from '@mui/material'
import { getSession, type ListeningSession } from '../../../entities/listening-session'
import { getWords, type IWord } from '../../../entities/word'
import { EditSessionForm } from '../../../features/edit-listening-session'

export default function ListeningSessionPage() {
  const { id } = useParams()
  const [session, setSession] = useState<(Omit<ListeningSession, 'words'> & { words: IWord[] }) | null>(null)
  const [words, setWords] = useState<IWord[]>([])
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setStatus('loading')
      try {
        if (!id) throw new Error('Нет ID сессии')
        const [sessionResult, wordsResult] = await Promise.all([getSession<IWord>(id), getWords()])
        if (cancelled) return
        setSession(sessionResult.session)
        setWords(wordsResult.words)
        setStatus('success')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }
    load()
    return () => { cancelled = true }
  }, [id, attempt])

  return (
    <Box>
      <Button component={Link} to="/user/sessions">К списку сессий</Button>
      <Typography variant="h5" sx={{ mb: 2 }}>Редактирование сессии</Typography>
      {status === 'loading' && <Typography>Загрузка…</Typography>}
      {status === 'error' && (
        <Box>
          <Typography color="error">Не удалось открыть сессию. Она может быть недоступна.</Typography>
          <Button onClick={() => setAttempt((value) => value + 1)}>Повторить</Button>
        </Box>
      )}
      {status === 'success' && session && <EditSessionForm key={session._id} session={session} availableWords={words} />}
    </Box>
  )
}
