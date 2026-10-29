import { useEffect, useState, type RefObject } from 'react'
import { Box, Button, Typography } from '@mui/material'

export function BackgroundAudioProbe({ audioRef, onStart }: {
  audioRef: RefObject<HTMLAudioElement | null>
  onStart: () => void
}) {
  const [error, setError] = useState('')

  useEffect(() => {
    const audio = audioRef.current
    return () => { audio?.pause() }
  }, [audioRef])

  function stop() {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    if (audio.readyState > 0) audio.currentTime = 0
  }

  return (
    <Box sx={{ mt: 2, p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
      <Typography variant="subtitle2">Временная проверка фонового MP3</Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Один сигнал → пауза → два сигнала → пауза → три сигнала → пауза.
        Круг длится около 24 секунд и повторяется автоматически. Это тестовый звук, не слова сессии.
      </Typography>
      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}audio/background-loop-probe.mp3`}
        controls
        loop
        preload="auto"
        aria-label="Проверка повторения MP3 в фоне"
        style={{ width: '100%' }}
        onPlay={() => { setError(''); onStart() }}
        onError={() => setError(`Не удалось загрузить MP3 (код ${audioRef.current?.error?.code ?? 'неизвестен'}).`)}
      />
      <Button size="small" onClick={stop}>Стоп проверки</Button>
      <Typography variant="body2">
        Нажмите ▶ в плеере выше, дождитесь сигналов и заблокируйте экран или откройте другое приложение.
        Проверьте минимум 5 кругов, затем 10–15 минут. Основная озвучка и проверка запускаются по отдельности.
      </Typography>
      {error && <Typography color="error" role="alert">{error}</Typography>}
    </Box>
  )
}
