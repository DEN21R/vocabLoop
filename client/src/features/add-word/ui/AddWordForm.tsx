import {
  Box,
  Button,
  Typography,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material'
import MenuItem from '@mui/material/MenuItem'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { useState, type FormEvent } from 'react'
import { addWord } from '../api/addWord'
import type { IWord } from '../../../entities/word'
import ramImage from '../../../shared/assets/ramNewWord.png'

const formTheme = createTheme({
  palette: {
    primary: { main: '#f78811', contrastText: '#5d2c07' },
    text: { primary: '#5d2c07', secondary: '#895a39' },
    background: { paper: '#fcf5f0' },
  },
  components: {
    MuiInputBase: { styleOverrides: { input: { fontSize: 16 } } },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '2px solid #f78811',
          '&:hover': { backgroundColor: '#fff0df' },
        },
      },
    },
  },
})

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
    <ThemeProvider theme={formTheme}>
      <DialogTitle
        sx={{
          position: 'relative',
          pr: '30%',
          minHeight: 'clamp(88px, 18dvh, 132px)',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        Новое слово
        <Box
          component="img"
          src={ramImage}
          alt=""
          aria-hidden="true"
          sx={{
            position: 'absolute',
            top: 25,
            right: -9,
            width: '70%',
            height: 'calc(100% - 16px)',
            objectFit: 'contain',
            transform: 'scale(1.15)',
            pointerEvents: 'none',
            animation: 'newWordRamFade 18s ease-in-out 0.5s both',
            '@keyframes newWordRamFade': {
              '0%, 100%': { opacity: 0 },
              '18%, 82%': { opacity: 1 },
            },
          }}
        />
      </DialogTitle>
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
    </ThemeProvider>
  )
}
export default AddWordForm
