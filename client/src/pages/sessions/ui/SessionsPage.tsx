import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Link from '@mui/material/Link'
import { Box, Button, Typography } from '@mui/material'
import {
  getSessions,
  deleteSession,
  type ListeningSession,
} from '../../../entities/listening-session'
import { getMe } from '../../../shared/api/auth'
import { IconButton } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import backHome from '../../../shared/assets/backHome.png'
import ramImage from '../../../shared/assets/ramSessi.png'

function SessionsPage() {
  const [showRam] = useState(() => {
    try {
      return sessionStorage.getItem('sessionsRamShown') !== '1'
    } catch {
      return false
    }
  })
  const [sessions, setSessions] = useState<ListeningSession[]>([])
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  )
  const [attempt, setAttempt] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [userName, setUserName] = useState('')

  async function handleDelete(session: ListeningSession) {
    if (
      deletingId ||
      !window.confirm(
        `Удалить сессию «${session.name}»? Слова и записи останутся в словаре.`,
      )
    )
      return
    setDeletingId(session._id)
    setDeleteError('')
    try {
      await deleteSession(session._id)
      setSessions((current) =>
        current.filter((item) => item._id !== session._id),
      )
    } catch {
      setDeleteError('Не удалось удалить сессию. Попробуйте ещё раз.')
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    let cancelled = false
    getSessions()
      .then((result) => {
        if (cancelled) return
        setSessions(result.sessions)
        setStatus('success')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [attempt])

  useEffect(() => {
    let cancelled = false

    getMe()
      .then(({ user }) => {
        if (!cancelled) setUserName(user.name)
      })
      .catch(() => {
        if (!cancelled) setUserName('')
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Box
      sx={{
        backgroundColor: 'transparent',
        backgroundImage: `url(${backHome})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        mx: '-24px',
        mt: '-24px',
        minHeight: '100vh',
        isolation: 'isolate',
      }}
    >
      {showRam && (
        <Box
          component="img"
          src={ramImage}
          alt=""
          aria-hidden="true"
          onAnimationStart={() => {
            try {
              sessionStorage.setItem('sessionsRamShown', '1')
            } catch {
              /* Хранилище может быть недоступно в браузере. */
            }
          }}
          sx={{
            position: 'fixed',
            left: { xs: 16, sm: 'calc(250px + 16px)' },
            right: 16,
            bottom: {
              xs: 'calc(80px + env(safe-area-inset-bottom))',
              sm: '8vh',
            },
            mx: 'auto',
            width: { xs: 'calc(100% - 32px)', sm: 'calc(100% - 282px)' },
            maxWidth: 360,
            maxHeight: '25dvh',
            objectFit: 'contain',
            pointerEvents: 'none',
            zIndex: 0,
            animation: 'sessionsRamFade 9s ease-in-out 2s both',
            '@keyframes sessionsRamFade': {
              '0%, 100%': { opacity: 0 },
              '25%, 75%': { opacity: 1 },
            },
          }}
        />
      )}
      <Box sx={{ p: 3, position: 'relative', zIndex: 1 }}>
        <Typography variant="h5">Привет {userName} 👋!</Typography>
        <Typography sx={{ mt: 1 }}>
          С возвращением, продолжаем идти к цели😊.
        </Typography>
        <Button
          component={RouterLink}
          sx={{
            color: '#f78811',
            border: '2px #f78811 solid',
            borderRadius: '12px',
            mt: 4,
          }}
          to="/user/home"
        >
          Выбрать слова и создать сессию
        </Button>
        {status === 'loading' && <Typography>Загрузка…</Typography>}
        {status === 'error' && (
          <Box>
            <Typography color="error">Не удалось загрузить сессии</Typography>
            <Button
              onClick={() => {
                setStatus('loading')
                setAttempt((value) => value + 1)
              }}
            >
              Повторить
            </Button>
          </Box>
        )}
        {status === 'success' && sessions.length === 0 && (
          <Typography>Пока нет сессий</Typography>
        )}
        {deleteError && (
          <Typography color="error" role="alert">
            {deleteError}
          </Typography>
        )}
        {status === 'success' &&
          sessions.map((session) => (
            <Box
              key={session._id}
              sx={{
                my: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'left',
                gap: 2,
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Link
                  component={RouterLink}
                  underline="none"
                  sx={{
                    fontWeight: 600,
                    color: '#650f0f',
                    '&:hover': {
                      color: '#c18787',
                    },
                  }}
                  to={`/user/sessions/${session._id}`}
                >
                  {session.name}
                </Link>
                <Typography>{session.words.length} слов</Typography>
              </Box>
              <IconButton
                sx={{ color: '#492703', ml: 'auto' }}
                aria-label="Удалить сессию"
                disabled={deletingId !== null}
                onClick={() => {
                  void handleDelete(session)
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
      </Box>
    </Box>
  )
}
export default SessionsPage
