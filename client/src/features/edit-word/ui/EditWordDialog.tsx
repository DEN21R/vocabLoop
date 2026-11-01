import { useState, type FormEvent } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material'
import { isAxiosError } from 'axios'
import { updateWord, type IWord } from '../../../entities/word'

export default function EditWordDialog({ word, onClose, onSaved }: {
  word: IWord
  onClose: () => void
  onSaved: (word: IWord) => void
}) {
  const [original, setOriginal] = useState(word.original)
  const [translation, setTranslation] = useState(word.translation)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const result = await updateWord(word._id, { original: original.trim(), translation: translation.trim() })
      onSaved(result.word)
    } catch (cause) {
      setError(isAxiosError(cause) && typeof cause.response?.data?.message === 'string'
        ? cause.response.data.message : 'Не удалось сохранить слово. Попробуйте ещё раз.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      aria-labelledby="edit-word-title"
      slotProps={{ paper: { component: 'form', onSubmit: handleSubmit, sx: {
        bgcolor: '#fcf5f0', color: '#5d2c07', borderRadius: 3,
        '& .MuiInputLabel-root': { color: '#895a39' },
        '& .MuiInputLabel-root.Mui-focused': { color: '#f78811' },
        '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: '#f78811' },
        '& .MuiInputBase-input': { color: '#5d2c07', fontSize: 16 },
      } } }}
    >
      <DialogTitle id="edit-word-title">Редактировать слово</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Слово" value={original} autoFocus required fullWidth margin="dense"
          disabled={saving} onChange={(event) => setOriginal(event.target.value)}
          slotProps={{ htmlInput: { maxLength: 200 } }}
        />
        <TextField
          label="Перевод" value={translation} required fullWidth multiline minRows={2}
          disabled={saving} onChange={(event) => setTranslation(event.target.value)}
          slotProps={{ htmlInput: { maxLength: 2000 } }}
        />
        {word.hasRecording && (
          <Typography variant="body2">Своя запись сохранится. Если меняете перевод, при необходимости запишите его заново.</Typography>
        )}
        {error && <Typography color="error" role="alert">{error}</Typography>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ color: '#895a39', '&:hover': { bgcolor: '#fff0df' } }}>Отмена</Button>
        <Button type="submit" disabled={saving || !original.trim() || !translation.trim()}
          sx={{ color: '#f78811', border: '2px solid #f78811', borderRadius: '12px', '&:hover': { bgcolor: '#fff0df' } }}>
          {saving ? 'Сохраняем…' : 'Сохранить'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
