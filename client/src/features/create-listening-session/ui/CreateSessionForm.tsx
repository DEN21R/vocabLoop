import { useState, type FormEvent } from 'react'
import { Box, Button, TextField, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { createSession } from '../api/createSession'

export default function CreateSessionForm({ wordIds }: { wordIds: string[] }) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Укажите название сессии')
      return
    }
    setError('')
    setSaving(true)
    try {
      const { session } = await createSession({ name: name.trim(), words: wordIds, intervalSeconds: 3 })
      navigate(`/user/sessions/${session._id}`)
    } catch {
      setError('Не удалось создать сессию. Попробуйте ещё раз.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ my: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography>Выбрано слов: {wordIds.length}. Порядок — по очереди выбора.</Typography>
      <TextField
        label="Название сессии"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
        disabled={saving}
        slotProps={{ htmlInput: { maxLength: 100 } }}
      />
      <Button type="submit" variant="outlined" disabled={saving || wordIds.length === 0}>
        {saving ? 'Сохраняем…' : 'Создать сессию из выбранных слов'}
      </Button>
      {error && <Typography color="error" role="alert">{error}</Typography>}
    </Box>
  )
}
