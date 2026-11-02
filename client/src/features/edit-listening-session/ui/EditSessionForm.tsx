import { useState, type FormEvent } from 'react'
import { Box, Button, IconButton, TextField, Typography } from '@mui/material'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import type { ListeningSession } from '../../../entities/listening-session'
import { updateWord, type IWord } from '../../../entities/word'
import { updateSession } from '../api/updateSession'
import ramLearnImage from '../../../shared/assets/ramLearn.png'

interface Props {
  session: Omit<ListeningSession, 'words'> & { words: IWord[] }
  activeWordId: string | null
  onWordsChange: (words: IWord[]) => void
  onIntervalSaved: (intervalSeconds: number) => void
}

export default function EditSessionForm({
  session,
  activeWordId,
  onWordsChange,
  onIntervalSaved,
}: Props) {
  const [name, setName] = useState(session.name)
  const [interval, setInterval] = useState(String(session.intervalSeconds))
  const [words, setWords] = useState(session.words)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [learnedRam, setLearnedRam] = useState<{ key: number; top: number; left: number } | null>(null)

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

  async function removeWord(wordId: string) {
    if (saving) return
    const next = words.filter((word) => word._id !== wordId)
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      await updateSession(session._id, { words: next.map((word) => word._id) })
      setWords(next)
      onWordsChange(next)
    } catch {
      setError('Не удалось убрать слово из сессии. Попробуйте ещё раз.')
    } finally {
      setSaving(false)
    }
  }

  async function learnWord(wordId: string, position: DOMRect) {
    if (saving) return
    const next = words.filter((word) => word._id !== wordId)
    setSaving(true)
    setSaved(false)
    setError('')
    let marked = false
    try {
      await updateWord(wordId, { isLearned: true })
      marked = true
      await updateSession(session._id, { words: next.map((word) => word._id) })
      setWords(next)
      onWordsChange(next)
      setLearnedRam({
        key: Date.now(),
        top: Math.max(16, Math.min(position.top - 100, window.innerHeight - 220)),
        left: Math.max(16, Math.min(position.right + 8, window.innerWidth - 216)),
      })
    } catch {
      setError(marked
        ? 'Слово отмечено как выученное, но не удалось убрать его из сессии. Нажмите «Выучил» ещё раз.'
        : 'Не удалось отметить слово как выученное. Попробуйте ещё раз.')
    } finally {
      setSaving(false)
    }
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
    if (
      interval === '' ||
      !Number.isInteger(intervalSeconds) ||
      intervalSeconds < 0 ||
      intervalSeconds > 60
    ) {
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
      setError(
        'Не удалось сохранить. Возможно, одно из слов удалено из словаря. Обновите страницу или повторите попытку.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <TextField
        label="Название сессии"
        value={name}
        required
        disabled={saving}
        onChange={(event) => {
          setName(event.target.value)
          setSaved(false)
        }}
        slotProps={{ htmlInput: { maxLength: 100 } }}
      />
      <TextField
        label="Интервал между словами, секунд"
        type="number"
        value={interval}
        required
        disabled={saving}
        onChange={(event) => {
          setInterval(event.target.value)
          setSaved(false)
        }}
        slotProps={{ htmlInput: { min: 0, max: 60, step: 1 } }}
      />
      <Typography>Слова в порядке воспроизведения</Typography>
      {words.length === 0 && (
        <Typography>
          Сессия пустая. Добавить слова можно на странице «Все слова», выбрав
          эту сессию.
        </Typography>
      )}
      {words.map((word, index) => (
        <Box
          key={word._id}
          aria-current={activeWordId === word._id ? 'true' : undefined}
          sx={{
            p: 1,
            borderRadius: 2,
            bgcolor: activeWordId === word._id ? '#ffe0b2' : 'transparent',
          }}
        >
          <Typography sx={{ mb: 1 }}>
            {index + 1}. {word.original} — {word.translation}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <IconButton
              sx={{
                color: '#f78811',
                border: '2px #f78811 solid',
                borderRadius: '50%', width: 36, height: 36,
              }}
              type="button"
              aria-label="Поднять слово"
              title="Выше"
              disabled={saving || index === 0}
              onClick={() => moveWord(index, -1)}
            >
              <KeyboardArrowUpIcon />
            </IconButton>
            <IconButton
              sx={{
                color: '#f78811',
                border: '2px #f78811 solid',
                borderRadius: '50%', width: 36, height: 36,
              }}
              type="button"
              aria-label="Опустить слово"
              title="Ниже"
              disabled={saving || index === words.length - 1}
              onClick={() => moveWord(index, 1)}
            >
              <KeyboardArrowDownIcon />
            </IconButton>
            <Button
              sx={{
                fontWeight: 'bold',
                textTransform: 'uppercase',
                fontSize: '0.6rem',
                color: '#f78811',
                border: '2px #f78811 solid',
                borderRadius: '12px',
              }}
              type="button"
              disabled={saving}
              onClick={() => {
                void removeWord(word._id)
              }}
            >
              Убрать из сессии
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={(event) => { void learnWord(word._id, event.currentTarget.getBoundingClientRect()) }}
              sx={{
                fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.6rem',
                color: '#fff', bgcolor: '#788447', border: '2px solid #788447', borderRadius: '12px',
                '&:hover': { bgcolor: '#626d37', borderColor: '#626d37' },
              }}
            >
              Выучил
            </Button>
          </Box>
        </Box>
      ))}
      {learnedRam && (
        <Box
          key={learnedRam.key}
          component="img"
          src={ramLearnImage}
          alt=""
          aria-hidden="true"
          sx={{
            position: 'fixed', top: learnedRam.top, left: learnedRam.left,
            width: 200, maxWidth: 'calc(100vw - 32px)', height: 'auto',
            pointerEvents: 'none', zIndex: 1400,
            animation: 'learnedRamFade 6s ease-in-out both',
            '@keyframes learnedRamFade': {
              '0%, 100%': { opacity: 0 },
              '12%, 85%': { opacity: 1 },
            },
          }}
        />
      )}
      {error && (
        <Typography color="error" role="alert">
          {error}
        </Typography>
      )}
      {saved && <Typography role="status">Сессия сохранена</Typography>}
      <Button
        type="submit"
        variant="outlined"
        disabled={saving}
        sx={{
          color: '#f78811',
          border: '2px #f78811 solid',
          borderRadius: '12px',
          '&:hover': { bgcolor: '#fff0df', borderColor: '#f78811' },
        }}
      >
        {saving ? 'Сохраняем…' : 'Сохранить изменения'}
      </Button>
    </Box>
  )
}
