import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Typography,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  TextField,
  Tooltip,
} from '@mui/material'
import MicIcon from '@mui/icons-material/Mic'
import EditIcon from '@mui/icons-material/Edit'
import CloseIcon from '@mui/icons-material/Close'
import ramImage from '../../../shared/assets/ram.png'
import { getWords, WordCard, type IWord } from '../../../entities/word'
import { useEffect, useRef, useState } from 'react'
import {
  getSessions,
  type ListeningSession,
} from '../../../entities/listening-session'
import AddWordForm from '../../../features/add-word/'
import EditWordDialog from '../../../features/edit-word/ui/EditWordDialog'
import { DeleteWordButton } from '../../../features/delete-word'
import {
  useWordPlayback,
  AudioControls,
  VoiceSettings,
} from '../../../features/play-word'
import { RecordWordDialog } from '../../../features/record-word'
import { CreateSessionForm } from '../../../features/create-listening-session'
import {
  loadPiperSelections,
  savePiperSelections,
  type PiperLanguage,
} from '../../../shared/lib/tts/piper'

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
  const [helpOpen, setHelpOpen] = useState(false)
  const closeHelp = () => setHelpOpen(false)
  const [status, setStatus] = useState<Status>('loading')
  const [words, setWords] = useState<IWord[]>([])
  const [search, setSearch] = useState('')
  const [sessionFilter, setSessionFilter] = useState<'all' | 'in' | 'out' | 'learned'>('all')
  const query = search.trim()
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [sessionWordIds, setSessionWordIds] = useState<Set<string> | null>(null)
  const [sessions, setSessions] = useState<ListeningSession[]>([])
  const [sessionsError, setSessionsError] = useState('')
  const request = useRef<AbortController | null>(null)
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([])
  const [selectedVoices, setSelectedVoices] = useState(loadPiperSelections)
  const [recordingWord, setRecordingWord] = useState<IWord | null>(null)
  const [editingWord, setEditingWord] = useState<IWord | null>(null)
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

  function handleVoiceChange(language: PiperLanguage, voiceId: string) {
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
    const matches = [newWord.original, newWord.translation].some((text) =>
      text.toLowerCase().includes(query.toLowerCase()),
    )
    if (matches && (sessionFilter === 'all' || sessionFilter === 'out')) setWords((previousWord) => [newWord, ...previousWord])
  }

  const handleWordDeleted = (wordId: string) => {
    request.current?.abort()
    setLoadingMore(false)
    setSelectedWordIds((ids) => ids.filter((id) => id !== wordId))
    setWords((previousWords) =>
      previousWords.filter((word) => word._id !== wordId),
    )
  }

  function handleWordUpdated(updated: IWord) {
    setWords((current) =>
      current
        .map((word) => (word._id === updated._id ? updated : word))
        .filter((word) =>
          [word.original, word.translation].some((text) =>
            text.toLowerCase().includes(query.toLowerCase()),
          ),
        ),
    )
    setEditingWord(null)
  }

  useEffect(() => {
    const controller = new AbortController()
    request.current = controller
    const fetchWords = async () => {
      setStatus('loading')
      setWords([])
      setNextCursor(null)
      setLoadingMore(false)
      setLoadError('')
      try {
        const result = await getWords({ search: query, session: sessionFilter }, controller.signal)
        if (controller.signal.aborted) return
        setWords(result.words)
        setNextCursor(result.nextCursor ?? null)
        setStatus('success')
      } catch {
        if (controller.signal.aborted) return
        setStatus('error')
      } finally {
        if (request.current === controller) request.current = null
      }
    }
    fetchWords()
    return () => {
      controller.abort()
      request.current?.abort()
    }
  }, [query, sessionFilter])

  useEffect(() => {
    let cancelled = false
    getSessions()
      .then(({ sessions }) => {
        if (!cancelled) {
          setSessions(sessions)
          setSessionWordIds(
            new Set(sessions.flatMap((session) => session.words)),
          )
        }
      })
      .catch(() => {
        if (!cancelled)
          setSessionsError(
            'Не удалось проверить состав сессий. Обновите страницу.',
          )
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function loadMore() {
    if (!nextCursor || request.current) return
    const controller = new AbortController()
    request.current = controller
    setLoadingMore(true)
    setLoadError('')
    try {
      const result = await getWords(
        { cursor: nextCursor, search: query, session: sessionFilter },
        controller.signal,
      )
      if (controller.signal.aborted) return
      setWords((current) => [
        ...new Map(
          [...current, ...result.words].map((word) => [word._id, word]),
        ).values(),
      ])
      setNextCursor(result.nextCursor ?? null)
    } catch {
      if (!controller.signal.aborted)
        setLoadError(
          'Не удалось загрузить следующую страницу. Повторите попытку.',
        )
    } finally {
      if (request.current === controller) {
        request.current = null
        setLoadingMore(false)
      }
    }
  }

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
      <TextField
        label="Поиск по слову или переводу"
        value={search}
        fullWidth
        size="small"
        sx={{ mb: 2 }}
        slotProps={{ htmlInput: { maxLength: 200 } }}
        onChange={(event) => {
          stop()
          setSearch(event.target.value)
        }}
      />
      <TextField
        select
        label="Показать слова"
        value={sessionFilter}
        fullWidth
        size="small"
        sx={{
          mb: 2,
          '& .MuiInputLabel-root': { color: '#895a39' },
          color: '#5d2c07',
          '& .MuiSelect-select': { color: '#5d2c07' },
          '& .MuiOutlinedInput-root': { bgcolor: '#fcf5f0' },
          '& .MuiSelect-icon': { color: '#895a39' },
          '& .MuiInputLabel-root.Mui-focused': { color: '#c97539' },
          '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: '#c97539' },
        }}
        slotProps={{ select: { MenuProps: { slotProps: { paper: { sx: {
          bgcolor: '#fcf5f0', color: '#5d2c07',
          '& .MuiMenuItem-root:hover': { bgcolor: '#f4e5d6' },
          '& .MuiMenuItem-root.Mui-selected': { bgcolor: '#ead7bd' },
          '& .MuiMenuItem-root.Mui-selected:hover, & .MuiMenuItem-root.Mui-focusVisible': { bgcolor: '#e1c49e' },
        } } } } } }}
        onChange={(event) => {
          stop()
          setSessionFilter(event.target.value as 'all' | 'in' | 'out' | 'learned')
        }}
      >
        <MenuItem value="all">Все слова</MenuItem>
        <MenuItem value="in">В сессиях</MenuItem>
        <MenuItem value="out">Без сессии</MenuItem>
        <MenuItem value="learned">Выученные слова</MenuItem>
      </TextField>
      {sessionsError && <Typography color="error">{sessionsError}</Typography>}
      {status === 'success' && (
        <Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              mb: 2,
            }}
          >
            <Button
              variant="contained"
              sx={{ backgroundColor: '#5d2c07' }}
              onClick={handleClickOpen}
            >
              добавить слово
            </Button>
            <Tooltip title="Как создать сессию">
              <IconButton
                aria-label="Открыть подсказку о создании сессии"
                onClick={() => setHelpOpen(true)}
                sx={{
                  p: 0,
                  width: 64,
                  height: 64,
                  overflow: 'hidden',
                  borderRadius: '50%',
                  flexShrink: 0,
                }}
              >
                <Box
                  component="img"
                  src={ramImage}
                  alt=""
                  sx={{
                    width: 64,
                    height: 64,
                    objectFit: 'cover',
                    objectPosition: 'center',
                    transform: 'scale(1.5)',
                    borderRadius: '50%',
                  }}
                />
              </IconButton>
            </Tooltip>
          </Box>
          <Dialog
            open={helpOpen}
            onClose={closeHelp}
            fullWidth
            maxWidth="sm"
            aria-labelledby="create-session-help-title"
            slotProps={{
              paper: {
                sx: { borderRadius: 3, bgcolor: '#fcf5f0', color: '#5d2c07' },
              },
            }}
          >
            <DialogTitle id="create-session-help-title" sx={{ pr: 7 }}>
              Как создать сессию
            </DialogTitle>
            <IconButton
              aria-label="Закрыть подсказку"
              onClick={closeHelp}
              sx={{
                position: 'absolute',
                right: 12,
                top: 12,
                color: '#895a39',
              }}
            >
              <CloseIcon />
            </IconButton>
            <DialogContent sx={{ pb: 3 }}>
              <Typography variant="h6" sx={{ mb: 1, color: '#895a39' }}>
                1. Выберите слова
              </Typography>
              <Typography sx={{ mb: 1 }}>
                Добавьте нужные слова в словарь, выберите голоса в меню «Выбрать
                голос» и прослушайте оригинал и перевод кнопкой ▶ рядом со
                словом.
              </Typography>
              <Typography>
                Отметьте «В сессию» у нужных слов. Порядок будет таким же, как
                очередность выбора. Слова, уже входящие в сессию, отмечены и
                недоступны для повторного выбора. Найти остальные слова можно
                через поиск или кнопку «Загрузить ещё».
              </Typography>
              <Divider sx={{ my: 2, borderColor: '#e7c4a7' }} />
              <Typography variant="h6" sx={{ mb: 1, color: '#895a39' }}>
                2. Создайте или дополните сессию
              </Typography>
              <Typography sx={{ mb: 1 }}>
                В поле «Сессия» оставьте «Создать новую», введите название и
                нажмите «Создать сессию из выбранных слов». Нужно выбрать хотя
                бы одно слово.
              </Typography>
              <Typography sx={{ mb: 1 }}>
                Чтобы дополнить существующую сессию, выберите её в том же списке
                и нажмите «Добавить выбранные слова в сессию». Слова добавятся в
                конец в порядке выбора, прежний порядок сохранится. Добавление
                слов выполняется на странице «Все слова».
              </Typography>
              <Typography>
                После сохранения откроется страница сессии. Нажмите «Подготовить
                аудио», дождитесь окончания подготовки и нажмите ▶ в плеере.
              </Typography>
            </DialogContent>
          </Dialog>
          <Dialog
            open={open}
            onClose={handleClickClose}
            fullWidth
            maxWidth="xs"
            sx={{ '& .MuiDialog-container': { alignItems: 'flex-start' } }}
            slotProps={{
              paper: {
                sx: {
                  mt: 'max(16px, env(safe-area-inset-top))',
                  mx: 2,
                  width: 'calc(100% - 32px)',
                  bgcolor: '#fcf5f0',
                  color: '#5d2c07',
                  border: '1px solid #e7c4a7',
                  borderRadius: 3,
                },
              },
            }}
          >
            <AddWordForm onCreated={handleWordCreated} />
          </Dialog>
          <CreateSessionForm wordIds={selectedWordIds} sessions={sessions} />
        </Box>
      )}

      <Box>
        {status === 'loading' && <Typography>Loading...</Typography>}

        {status === 'error' && (
          <Typography color="error">Не удалось загрузить слова</Typography>
        )}

        {status === 'success' && words.length === 0 && (
          <Typography>
            {query ? 'Ничего не найдено' : sessionFilter === 'in' ? 'Нет слов в сессиях' : sessionFilter === 'out' ? 'Нет слов без сессии' : sessionFilter === 'learned' ? 'Пока нет выученных слов' : 'Пока нет слов'}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
          {words.map((word) => (
            <Box
              sx={{
                backgroundColor: word.isLearned ? '#e8ecd3' : '#fcf5f0',
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
                    sx={{
                      color: '#FF9800',
                      '&.Mui-checked': {
                        color: '#FF9800',
                      },
                      '&.Mui-disabled': {
                        color: '#9e9e9e',
                      },
                    }}
                    checked={
                      sessionWordIds?.has(word._id) ||
                      selectedWordIds.includes(word._id)
                    }
                    disabled={!sessionWordIds || sessionWordIds.has(word._id)}
                    onChange={(_, checked) =>
                      setSelectedWordIds((ids) =>
                        checked ?
                          [...ids, word._id]
                        : ids.filter((id) => id !== word._id),
                      )
                    }
                  />
                }
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <WordCard el={word} />
                {word.isLearned && (
                  <Typography variant="body2" sx={{ color: '#66713f', fontWeight: 'bold' }}>
                    Выучил
                  </Typography>
                )}
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
                  gap: { xs: 0.5, sm: 2 },
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
                  sx={{ color: '#895a39' }}
                >
                  <MicIcon />
                </IconButton>

                <Tooltip title="Редактировать слово">
                  <IconButton
                    disabled={isPlaying || recordingWord !== null}
                    onClick={() => setEditingWord(word)}
                    aria-label="Редактировать слово"
                    sx={{ color: '#895a39' }}
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <DeleteWordButton el={word} onDeleted={handleWordDeleted} />
              </Box>
            </Box>
          ))}
          {loadError && <Typography color="error">{loadError}</Typography>}
          {status === 'success' && nextCursor && (
            <Button
              sx={{ color: '#f78811' }}
              onClick={() => {
                void loadMore()
              }}
              disabled={loadingMore}
            >
              {loadingMore ? 'Загружаем…' : 'Загрузить ещё'}
            </Button>
          )}
          {editingWord && (
            <EditWordDialog
              key={editingWord._id}
              word={editingWord}
              onClose={() => setEditingWord(null)}
              onSaved={handleWordUpdated}
            />
          )}
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
