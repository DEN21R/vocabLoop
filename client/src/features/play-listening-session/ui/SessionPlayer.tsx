import { Box, Button, Typography } from '@mui/material'
import { useRef } from 'react'
import type { IWord } from '../../../entities/word'
import { useSessionPlayer } from '../model/useSessionPlayer'
import { BackgroundAudioProbe } from './BackgroundAudioProbe'

export default function SessionPlayer({
  words,
  intervalSeconds,
}: {
  words: IWord[]
  intervalSeconds: number
}) {
  const { status, progress, error, play, pause, stop } = useSessionPlayer(
    words,
    intervalSeconds,
  )
  const word = words[progress.index]
  const probeAudioRef = useRef<HTMLAudioElement | null>(null)

  function playSession() {
    probeAudioRef.current?.pause()
    void play()
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Typography>
        Прослушивание по кругу. Интервал: {intervalSeconds} сек.
      </Typography>
      {words.length === 0 ?
        <Typography>Добавьте слова для прослушивания.</Typography>
      : <Typography>
          {status === 'stopped' ?
            'Остановлено'
          : status === 'paused' ?
            'На паузе'
          : 'Воспроизводится'}
          {' · '}
          {progress.index + 1} / {words.length}: {word?.original} —{' '}
          {word?.translation}
        </Typography>
      }
      <Button
        onClick={playSession}
        disabled={status === 'playing' || words.length === 0}
      >
        {status === 'paused' ? 'Продолжить' : 'Запустить'}
      </Button>
      <Button onClick={pause} disabled={status !== 'playing'}>
        Пауза
      </Button>
      <Button onClick={stop} disabled={status === 'stopped'}>
        Стоп
      </Button>
      <Typography variant="body2">
        Если есть своя запись перевода, используется она. После паузы текущая
        реплика звучит заново.
      </Typography>
      {error && (
        <Typography color="error" role="alert">
          {error}
        </Typography>
      )}
      <BackgroundAudioProbe
        audioRef={probeAudioRef}
        onStart={() => { if (status !== 'stopped') stop() }}
      />
    </Box>
  )
}
