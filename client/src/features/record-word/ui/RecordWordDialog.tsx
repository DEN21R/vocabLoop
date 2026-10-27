import {
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Dialog,
  Typography,
  Box,
} from '@mui/material'
import { useWordRecorder } from '../model/useWordRecorder'
import { useEffect, useState } from 'react'
import { saveRecording, deleteRecording } from '../api/recording'
import StopIcon from '@mui/icons-material/Stop'
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver'
import VoiceOverOffIcon from '@mui/icons-material/VoiceOverOff'
import SaveIcon from '@mui/icons-material/Save'
import CloseIcon from '@mui/icons-material/Close'

type RecordWordDialogProps = {
  open: boolean
  wordId: string
  translation: string
  hasRecording: boolean
  onDeleted: (wordId: string) => void
  onClose: () => void
  onSaved: (wordId: string) => void
}

function RecordWordDialog({
  open,
  wordId,
  translation,
  hasRecording,
  onDeleted,
  onClose,
  onSaved,
}: RecordWordDialogProps) {
  const {
    isRecording,
    isStarting,
    error,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useWordRecorder()
  const [audioUrl, setAudioUrl] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!audioBlob) {
      setAudioUrl('')
      return
    }

    const url = URL.createObjectURL(audioBlob)
    setAudioUrl(url)

    return () => URL.revokeObjectURL(url)
  }, [audioBlob])

  async function handleSave() {
    if (
      !audioBlob ||
      !wordId ||
      isSaving ||
      isDeleting ||
      isRecording ||
      isStarting
    )
      return

    setIsSaving(true)
    setSaveError(null)

    try {
      await saveRecording(wordId, audioBlob)
      onSaved(wordId)
      cancelRecording()
      onClose()
    } catch {
      setSaveError('Не удалось сохранить запись. Попробуй ещё раз.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (
      !wordId ||
      !hasRecording ||
      isSaving ||
      isDeleting ||
      isRecording ||
      isStarting
    )
      return

    setIsDeleting(true)
    setSaveError(null)

    try {
      await deleteRecording(wordId)
      onDeleted(wordId)
      cancelRecording()
      onClose()
    } catch {
      setSaveError('Не удалось удалить запись. Попробуй ещё раз.')
    } finally {
      setIsDeleting(false)
    }
  }

  function handleClose() {
    if (isSaving || isDeleting) return

    cancelRecording()
    setSaveError(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Записать перевод</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {saveError && <p>{saveError}</p>}
        {translation} {error && <p>{error}</p>}
        {audioUrl && !isRecording && !isStarting && (
          <audio key={audioUrl} controls src={audioUrl} />
        )}
        {isRecording && (
          <Box
            sx={{
              width: 15,
              height: 15,
              borderRadius: '50%',
              bgcolor: 'error.main',
              animation: 'recordingPulse 1.2s ease-in-out infinite',

              '@keyframes recordingPulse': {
                '0%, 100%': {
                  opacity: 1,
                  transform: 'scale(1)',
                },
                '50%': {
                  opacity: 0.4,
                  transform: 'scale(1.4)',
                },
              },

              '@media (prefers-reduced-motion: reduce)': {
                animation: 'none',
              },
            }}
          />
        )}
        {isRecording && (
          <Typography variant="body2" color="error">
            Идёт запись…
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          disabled={isStarting || isSaving || isDeleting}
          onClick={isRecording ? stopRecording : startRecording}
        >
          {isRecording ?
            <StopIcon color="error" />
          : <RecordVoiceOverIcon />}
        </Button>
        <Button
          onClick={handleSave}
          disabled={
            !audioBlob || isRecording || isStarting || isSaving || isDeleting
          }
        >
          {isSaving ? 'Сохраняем…' : <SaveIcon />}
        </Button>
        {hasRecording && (
          <Button
            color="error"
            onClick={handleDelete}
            disabled={isSaving || isDeleting || isRecording || isStarting}
          >
            {isDeleting ? 'Удаляем…' : <VoiceOverOffIcon />}
          </Button>
        )}
        <Button onClick={handleClose} disabled={isSaving || isDeleting}>
          <CloseIcon />
        </Button>
      </DialogActions>
    </Dialog>
  )
}
export default RecordWordDialog
