import {
  Box,
  Button,
  Typography,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material'
import MenuItem from '@mui/material/MenuItem'
import { useState, type FormEvent } from 'react'
import { addWord } from '../api/addWord'
import type { IWord } from '../../../entities/word'

const languagesArray = [
  {
    value: 'en',
    label: 'Английский',
  },
  {
    value: 'ru',
    label: 'Русский',
  },
  {
    value: 'uk',
    label: 'Украинский',
  },
  {
    value: 'de',
    label: 'Немецкий',
  },
]

interface AddWordProps {
  onCreated: (word: IWord) => void
}

function AddWordForm({ onCreated }: AddWordProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [original, setOriginal] = useState('')
  const [sourceLanguage, setSourceLanguage] = useState('en')
  const [targetLanguage, setTargetLanguage] = useState('ru')
  const [sabmitErrror, setSabmitError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSabmitError('')

    const data = {
      original: original.trim(),
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage,
    }
    if (!data.original) {
      return setSabmitError('заполни поле оигинал ')
    }

    if (sourceLanguage === targetLanguage) {
      return setSabmitError('выбраны одинаковые языки')
    }

    try {
      setIsSubmitting(true)
      const result = await addWord(data)
      onCreated(result.word)
      setOriginal('')
    } catch {
      setSabmitError('не удалось добавить слово')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box>
      <DialogTitle>Новое слово</DialogTitle>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              autoFocus
              margin="dense"
              value={original}
              label="введите слово"
              fullWidth
              variant="standard"
              disabled={isSubmitting}
              onChange={(e) => setOriginal(e.target.value)}
            />

            <TextField
              select
              label="Выберети язык оригинала"
              variant="standard"
              value={sourceLanguage}
              disabled={isSubmitting}
              onChange={(e) => setSourceLanguage(e.target.value)}
            >
              {languagesArray.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Выберети язык перевода"
              variant="standard"
              value={targetLanguage}
              disabled={isSubmitting}
              onChange={(e) => setTargetLanguage(e.target.value)}
            >
              {languagesArray.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            {sabmitErrror && (
              <Typography color="error">{sabmitErrror}</Typography>
            )}
            <Button type="submit" variant="outlined" disabled={isSubmitting}>
              {isSubmitting ? 'Переводим и сохраняем…' : 'Сохранить'}
            </Button>
          </Box>
        </form>
      </DialogContent>
    </Box>
  )
}
export default AddWordForm
