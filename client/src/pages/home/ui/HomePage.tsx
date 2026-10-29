import {
  Box,
  Button,
  Dialog,
  IconButton,
  Typography,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
} from '@mui/material'
import MicIcon from '@mui/icons-material/Mic'
import { getWords, WordCard, type IWord } from '../../../entities/word'
import { useEffect, useState } from 'react'
import AddWordForm from '../../../features/add-word/'
import { DeleteWordButton } from '../../../features/delete-word'
import {
  useWordPlayback,
  AudioControls,
  VoiceSettings,
} from '../../../features/play-word'
import { RecordWordDialog } from '../../../features/record-word'
import { CreateSessionForm } from '../../../features/create-listening-session'
import { loadPiperSelections, savePiperSelections, type PiperLanguage } from '../../../shared/lib/tts/piper'

type Status = 'loading' | 'success' | 'error'

function loadTranslationSources() {
  const saved = localStorage.getItem('translationSources')

  if (saved === null) {
    return {}
  }

  return JSON.parse(saved)
}

function HomePage() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<Status>('loading')
  const [words, setWords] = useState<IWord[]>([])
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([])
  const [selectedVoices, setSelectedVoices] = useState(loadPiperSelections)
  const [recordingWord, setRecordingWord] = useState<IWord | null>(null)
  const [translationSources, setTranslationSources] = useState<
    Record<string, 'tts' | 'recording'>
  >(loadTranslationSources)

  const {
    playWord,
    stop,
    activeWordId,
    isPlaying,
    error: playbackError,
  } = useWordPlayback(selectedVoices)

  function handleVoiceChange(
    language: PiperLanguage,
    voiceId: string,
  ) {
    stop()
    const updatedVoices = { ...selectedVoices, [language]: voiceId }
    savePiperSelections(updatedVoices)
    setSelectedVoices(updatedVoices)
  }

  const handleClickOpen = () => {
    setOpen(true)
  }
  const handleClickClose = () => {
    setOpen(false)
  }

  const handleWordCreated = (newWord: IWord) => {
    setWords((previousWord) => [newWord, ...previousWord])
  }

  const handleWordDeleted = (wordId: string) => {
    setSelectedWordIds((ids) => ids.filter((id) => id !== wordId))
    setWords((previousWords) =>
      previousWords.filter((word) => word._id !== wordId),
    )
  }

  useEffect(() => {
    let cancelled = false
    const fetchWords = async () => {
      setStatus('loading')
      try {
        const result = await getWords()
        if (cancelled) return
        setWords(result.words)
        setStatus('success')
      } catch {
        if (cancelled) return
        setStatus('error')
      }
    }
    fetchWords()
    return () => {
      cancelled = true
    }
  }, [])

  function handleRecordingSaved(wordId: string) {
    setWords((previousWords) =>
      previousWords.map((word) =>
        word._id === wordId ? { ...word, hasRecording: true } : word,
      ),
    )
  }

  function handleRecordingDeleted(wordId: string) {
    setWords((previousWords) =>
      previousWords.map((word) =>
        word._id === wordId ? { ...word, hasRecording: false } : word,
      ),
    )
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, textAlign: 'center' }}>
        Все слова
      </Typography>
      <VoiceSettings
        selectedVoices={selectedVoices}
        onVoiceChange={handleVoiceChange}
      />
      {status === 'success' && (
        <Box>
          <Button
            variant="contained"
            sx={{ backgroundColor: '#5d2c07', mb: 2 }}
            onClick={handleClickOpen}
          >
            добавить слово
          </Button>

          <Dialog open={open} onClose={handleClickClose}>
            <AddWordForm onCreated={handleWordCreated} />
          </Dialog>
          <CreateSessionForm wordIds={selectedWordIds} />
        </Box>
      )}

      <Box>
        {status === 'loading' && <Typography>Loading...</Typography>}

        {status === 'error' && (
          <Typography color="error">Не удалось загрузить слова</Typography>
        )}

        {status === 'success' && words.length === 0 && (
          <Typography>Пока нет слов</Typography>
        )}

        <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
          {words.map((word) => (
            <Box
              sx={{
                backgroundColor: '#fcf5f0',
                boxShadow: '1px 2px 5px #9a8c79',
                borderRadius: '10px',
                display: 'flex',
                gap: 2,
                p: 2,
                alignItems: { xs: 'stretch', sm: 'center' },
                flexDirection: { xs: 'column', sm: 'row' },
              }}
              key={word._id}
            >
              <FormControlLabel
                label="В сессию"
                control={
                  <Checkbox
                    checked={selectedWordIds.includes(word._id)}
                    onChange={(_, checked) => setSelectedWordIds((ids) =>
                      checked ? [...ids, word._id] : ids.filter((id) => id !== word._id),
                    )}
                  />
                }
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <WordCard el={word} />
                {word.hasRecording && (
                  <Typography variant="body2" color="text.secondary">
                    Есть моя запись
                  </Typography>
                )}
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  flexWrap: 'wrap',
                }}
              >
                {word.hasRecording && (
                  <Select
                    size="small"
                    value={translationSources[word._id] ?? 'tts'}
                    disabled={isPlaying || recordingWord !== null}
                    inputProps={{ 'aria-label': 'Источник перевода' }}
                    onChange={(event) => {
                      const source = event.target.value
                      if (source !== 'tts' && source !== 'recording') return

                      const updatedSources = {
                        ...translationSources,
                        [word._id]: source,
                      }

                      setTranslationSources(updatedSources)

                      localStorage.setItem(
                        'translationSources',
                        JSON.stringify(updatedSources),
                      )
                    }}
                  >
                    <MenuItem value="tts">Голос Piper</MenuItem>
                    <MenuItem value="recording">Моя запись</MenuItem>
                  </Select>
                )}
                <AudioControls
                  isPlaying={activeWordId === word._id}
                  playDisabled={isPlaying || recordingWord !== null}
                  onPlay={() =>
                    playWord(
                      word,
                      word.hasRecording ?
                        (translationSources[word._id] ?? 'tts')
                      : 'tts',
                    )
                  }
                  onStop={stop}
                />

                <IconButton
                  disabled={isPlaying}
                  onClick={() => setRecordingWord(word)}
                  aria-label="Записать перевод"
                >
                  <MicIcon />
                </IconButton>

                <DeleteWordButton el={word} onDeleted={handleWordDeleted} />
              </Box>
            </Box>
          ))}
          <RecordWordDialog
            open={recordingWord !== null}
            wordId={recordingWord?._id ?? ''}
            translation={recordingWord?.translation ?? ''}
            onClose={() => setRecordingWord(null)}
            onSaved={handleRecordingSaved}
            hasRecording={recordingWord?.hasRecording ?? false}
            onDeleted={handleRecordingDeleted}
          />
          {playbackError && (
            <Typography color="error">{playbackError}</Typography>
          )}
        </Box>
      </Box>
    </Box>
  )
}

export default HomePage
