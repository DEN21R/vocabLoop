import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Box, Button, Dialog, DialogContent, DialogTitle, Divider, IconButton, Tooltip, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ramImage from '../../../shared/assets/ram.png'
import {
  getSession,
  type ListeningSession,
} from '../../../entities/listening-session'
import { getWords, type IWord } from '../../../entities/word'
import { EditSessionForm } from '../../../features/edit-listening-session'
import { SessionPlayer } from '../../../features/play-listening-session'

export default function ListeningSessionPage() {
  const { id } = useParams()
  const [session, setSession] = useState<
    (Omit<ListeningSession, 'words'> & { words: IWord[] }) | null
  >(null)
  const [words, setWords] = useState<IWord[]>([])
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  )
  const [attempt, setAttempt] = useState(0)
  const [helpOpen, setHelpOpen] = useState(false)
  const closeHelp = () => setHelpOpen(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setStatus('loading')
      try {
        if (!id) throw new Error('Нет ID сессии')
        const [sessionResult, wordsResult] = await Promise.all([
          getSession<IWord>(id),
          getWords(),
        ])
        if (cancelled) return
        setSession(sessionResult.session)
        setWords(wordsResult.words)
        setStatus('success')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, attempt])

  return (
    <Box>
      <Button
        sx={{
          color: '#f78811',
          border: '2px #f78811 solid',
          borderRadius: '12px',
          mt: 4,
        }}
        component={Link}
        to="/user/sessions"
      >
        К списку сессий
      </Button>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Typography variant="h5">Редактирование сессии</Typography>
        <Tooltip title="Подсказки по сессии">
          <IconButton aria-label="Открыть подсказки по сессии" onClick={() => setHelpOpen(true)}
            sx={{ p: 0.5, flexShrink: 0, borderRadius: 3, border: '1px solid #e7c4a7', bgcolor: '#fcf5f0', '&:hover': { bgcolor: '#f7e8db' } }}>
            <Box component="img" src={ramImage} alt="" sx={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 2 }} />
          </IconButton>
        </Tooltip>
      </Box>
      <Dialog open={helpOpen} onClose={closeHelp} fullWidth maxWidth="sm" aria-labelledby="session-help-title"
        slotProps={{ paper: { sx: { borderRadius: 3, bgcolor: '#fcf5f0', color: '#5d2c07' } } }}>
        <DialogTitle id="session-help-title" sx={{ pr: 7 }}>Подсказки по сессии</DialogTitle>
        <IconButton aria-label="Закрыть подсказки" onClick={closeHelp}
          sx={{ position: 'absolute', right: 12, top: 12, color: '#895a39' }}>
          <CloseIcon />
        </IconButton>
        <DialogContent sx={{ pb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1, color: '#895a39' }}>Аудио и прослушивание</Typography>
          <Typography>
            Сначала подготовьте аудио с открытым экраном, затем нажмите ▶ в плеере.
            Своя запись перевода имеет приоритет. Пауза сохраняет точное место воспроизведения.
            Готовая озвучка сохраняется в браузере; после очистки данных сайта её потребуется подготовить заново.
          </Typography>
          <Divider sx={{ my: 2, borderColor: '#e7c4a7' }} />
          <Typography variant="h6" sx={{ mb: 1, color: '#895a39' }}>Изменения и сохранение</Typography>
          <Typography>
            Состав и порядок меняются в плеере сразу. Для записи в базу нажмите «Сохранить изменения».
            После изменения состава, порядка или сохранения интервала подготовьте аудиотрек заново.
          </Typography>
        </DialogContent>
      </Dialog>
      {status === 'loading' && <Typography>Загрузка…</Typography>}
      {status === 'error' && (
        <Box>
          <Typography color="error">
            Не удалось открыть сессию. Она может быть недоступна.
          </Typography>
          <Button onClick={() => setAttempt((value) => value + 1)}>
            Повторить
          </Button>
        </Box>
      )}
      {status === 'success' && session && session._id === id && (
        <Box key={session._id}>
          <SessionPlayer
            words={session.words}
            intervalSeconds={session.intervalSeconds}
          />
          <EditSessionForm
            session={session}
            availableWords={words}
            onWordsChange={(next) =>
              setSession((current) =>
                current ? { ...current, words: next } : current,
              )
            }
            onIntervalSaved={(intervalSeconds) =>
              setSession((current) =>
                current ? { ...current, intervalSeconds } : current,
              )
            }
          />
        </Box>
      )}
    </Box>
  )
}
