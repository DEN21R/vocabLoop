import { useState, type FormEvent } from 'react'
import { Box, Button, MenuItem, TextField, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { createSession } from '../api/createSession'
import { getSession, type ListeningSession } from '../../../entities/listening-session'
import type { IWord } from '../../../entities/word'
import { updateSession } from '../../edit-listening-session/api/updateSession'

export default function CreateSessionForm({ wordIds, sessions }: { wordIds: string[]; sessions: ListeningSession[] }) {
  const navigate = useNavigate()
  const [sessionId, setSessionId] = useState('new')
  const isNew = sessionId === 'new'
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (saving || wordIds.length === 0) return
    if (isNew && !name.trim()) {
      setError('Укажите название сессии')
      return
    }
    setError('')
    setSaving(true)
    try {
      if (!isNew) {
        const { session } = await getSession<IWord>(sessionId)
        await updateSession(sessionId, {
          words: [...new Set([...session.words.map((word) => word._id), ...wordIds])],
        })
        navigate(`/user/sessions/${sessionId}`)
        return
      }
      const { session } = await createSession({
        name: name.trim(),
        words: wordIds,
        intervalSeconds: 3,
      })
      navigate(`/user/sessions/${session._id}`)
    } catch {
      setError(isNew ? 'Не удалось создать сессию. Попробуйте ещё раз.' : 'Не удалось добавить слова в сессию. Попробуйте ещё раз.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        my: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        border: '2px #895a39 solid',
        borderRadius: '12px',
        p: 2,
      }}
    >
      <Typography>Выбрано слов: {wordIds.length}.</Typography>
      <TextField
        select
        label="Сессия"
        value={sessionId}
        onChange={(event) => { setSessionId(event.target.value); setError('') }}
        disabled={saving}
      >
        <MenuItem value="new">Создать новую</MenuItem>
        {sessions.map((session) => (
          <MenuItem key={session._id} value={session._id}>{session.name}</MenuItem>
        ))}
      </TextField>
      {isNew && (
        <TextField
          label="Название сессии"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          disabled={saving}
          slotProps={{ htmlInput: { maxLength: 100 } }}
        />
      )}
      <Button
        sx={{
          color: '#f78811',
          border: '2px #f78811 solid',
          borderRadius: '12px',
          mt: 4,
        }}
        type="submit"
        variant="outlined"
        disabled={saving || wordIds.length === 0}
      >
        {saving ? 'Сохраняем…' : isNew ? 'Создать сессию из выбранных слов' : 'Добавить выбранные слова в сессию'}
      </Button>
      {error && (
        <Typography color="error" role="alert">
          {error}
        </Typography>
      )}
    </Box>
  )
}
