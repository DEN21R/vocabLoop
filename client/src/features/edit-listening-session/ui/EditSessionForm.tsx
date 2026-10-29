import { useState, type FormEvent } from 'react'
import { Box, Button, TextField, Typography } from '@mui/material'
import type { ListeningSession } from '../../../entities/listening-session'
import type { IWord } from '../../../entities/word'
import { updateSession } from '../api/updateSession'

interface Props {
  session: Omit<ListeningSession, 'words'> & { words: IWord[] }
  availableWords: IWord[]
  onWordsChange: (words: IWord[]) => void
  onIntervalSaved: (intervalSeconds: number) => void
}

export default function EditSessionForm({ session, availableWords, onWordsChange, onIntervalSaved }: Props) {
  const [name, setName] = useState(session.name)
  const [interval, setInterval] = useState(String(session.intervalSeconds))
  const [words, setWords] = useState(session.words)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  function moveWord(index: number, direction: number) {
    const next = [...words]
    const target = index + direction
    const word = next[index]
    next[index] = next[target]
    next[target] = word
    setWords(next)
    onWordsChange(next)
    setSaved(false)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaved(false)
    setError('')
    const intervalSeconds = Number(interval)
    if (!name.trim() || name.trim().length > 100) {
      setError('Название должно содержать от 1 до 100 символов')
      return
    }
    if (interval === '' || !Number.isInteger(intervalSeconds) || intervalSeconds < 0 || intervalSeconds > 60) {
      setError('Интервал должен быть целым числом от 0 до 60')
      return
    }
    setSaving(true)
    try {
      const result = await updateSession(session._id, {
        name: name.trim(),
        words: words.map((word) => word._id),
        intervalSeconds,
      })
      setName(result.session.name)
      onIntervalSaved(result.session.intervalSeconds)
      setSaved(true)
    } catch {
      setError('Не удалось сохранить. Возможно, одно из слов удалено из словаря. Обновите страницу или повторите попытку.')
    } finally {
      setSaving(false)
    }
  }

  const otherWords = availableWords.filter((word) => !words.some((selected) => selected._id === word._id))

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField
        label="Название сессии"
        value={name}
        required
        disabled={saving}
        onChange={(event) => { setName(event.target.value); setSaved(false) }}
        slotProps={{ htmlInput: { maxLength: 100 } }}
      />
      <TextField
        label="Интервал между словами, секунд"
        type="number"
        value={interval}
        required
        disabled={saving}
        onChange={(event) => { setInterval(event.target.value); setSaved(false) }}
        slotProps={{ htmlInput: { min: 0, max: 60, step: 1 } }}
      />
      <Typography>Слова в порядке воспроизведения</Typography>
      {words.length === 0 && <Typography>Сессия пустая. Можно добавить слова ниже или сохранить пустой набор.</Typography>}
      {words.map((word, index) => (
        <Box key={word._id}>
          <Typography>{index + 1}. {word.original} — {word.translation}</Typography>
          <Button type="button" disabled={saving || index === 0} onClick={() => moveWord(index, -1)}>Выше</Button>
          <Button type="button" disabled={saving || index === words.length - 1} onClick={() => moveWord(index, 1)}>Ниже</Button>
          <Button type="button" disabled={saving} onClick={() => {
            const next = words.filter((item) => item._id !== word._id)
            setWords(next)
            onWordsChange(next)
            setSaved(false)
          }}>Убрать из сессии</Button>
        </Box>
      ))}
      <Typography>Добавить из словаря</Typography>
      {otherWords.length === 0 && <Typography>Нет других слов</Typography>}
      {otherWords.map((word) => (
        <Box key={word._id}>
          <Typography>{word.original} — {word.translation}</Typography>
          <Button type="button" disabled={saving} onClick={() => {
            const next = [...words, word]
            setWords(next)
            onWordsChange(next)
            setSaved(false)
          }}>Добавить</Button>
        </Box>
      ))}
      <Typography variant="body2">Состав и порядок меняются в плеере сразу. Для записи в базу нажмите «Сохранить изменения». После изменения состава, порядка или сохранения интервала подготовьте аудиотрек заново.</Typography>
      {error && <Typography color="error" role="alert">{error}</Typography>}
      {saved && <Typography role="status">Сессия сохранена</Typography>}
      <Button type="submit" variant="outlined" disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить изменения'}</Button>
    </Box>
  )
}
