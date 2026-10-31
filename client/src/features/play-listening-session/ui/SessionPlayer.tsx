import { useState } from 'react'
import { Box, Button, MenuItem, TextField, Typography } from '@mui/material'
import type { IWord } from '../../../entities/word'
import {
  loadPiperSelections,
  type PiperSelections,
} from '../../../shared/lib/tts/piper'
import { useSessionPlayer } from '../model/useSessionPlayer'

export default function SessionPlayer({
  words,
  intervalSeconds,
}: {
  words: IWord[]
  intervalSeconds: number
}) {
  const [voices] = useState(loadPiperSelections)
  return (
    <Box sx={{ mb: 3 }}>
      <Typography>
        Прослушивание по кругу. Интервал: {intervalSeconds} сек.
      </Typography>
      <Playback
        key={JSON.stringify([
          words.map((word) => [
            word._id,
            word.original,
            word.translation,
            word.sourceLanguage,
            word.targetLanguage,
            word.hasRecording,
            word.updatedAt,
          ]),
          intervalSeconds,
          voices,
        ])}
        words={words}
        intervalSeconds={intervalSeconds}
        voices={voices}
      />
      <Typography variant="caption">
        <a
          href={`${import.meta.env.BASE_URL}licenses/piper/index.html`}
          target="_blank"
          rel="noreferrer"
        >
          Лицензии и исходники Piper
        </a>
      </Typography>
    </Box>
  )
}

function Playback({
  words,
  intervalSeconds,
  voices,
}: {
  words: IWord[]
  intervalSeconds: number
  voices: PiperSelections
}) {
  const { status, progress, error, message, ready, audioRef, prepare, stop } =
    useSessionPlayer(words, intervalSeconds, voices)
  const [speed, setSpeed] = useState(1)
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
  const word = words[progress.index]
  return (
    <>
      <Typography>
        {status === 'preparing' ?
          'Подготовка'
        : status === 'playing' ?
          'Воспроизводится'
        : status === 'paused' ?
          'На паузе'
        : status === 'ready' ?
          'Готово'
        : 'Остановлено'}
        {word ?
          ` · ${progress.index + 1} / ${words.length}: ${word.original} — ${word.translation}`
        : ' · Добавьте слова для прослушивания.'}
        {status === 'playing' && progress.phase === 'waiting' && ' · Интервал'}
      </Typography>
      <Button
        onClick={() => {
          void prepare()
        }}
        disabled={ready || status === 'preparing' || !words.length}
      >
        {status === 'preparing' ?
          'Подготовка…'
        : ready ?
          'Аудио подготовлено'
        : 'Подготовить аудио'}
      </Button>
      {status === 'preparing' && <Button onClick={stop}>Отменить</Button>}
      <audio
        ref={audioRef}
        controls
        loop
        preload="metadata"
        hidden={!ready}
        onRateChange={() => setSpeed(audioRef.current?.playbackRate ?? 1)}
        style={{ width: '100%', marginTop: 12 }}
      />
      {ready && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
            my: 1,
          }}
        >
          <TextField
            select
            label="Скорость"
            size="small"
            value={speed}
            sx={{ minWidth: 120 }}
            onChange={(event) => {
              const rate = Number(event.target.value)
              const audio = audioRef.current!
              audio.defaultPlaybackRate = rate
              audio.playbackRate = rate
              setSpeed(rate)
            }}
          >
            {!speeds.includes(speed) && (
              <MenuItem value={speed}>{speed}×</MenuItem>
            )}
            {speeds.map((rate) => (
              <MenuItem key={rate} value={rate}>
                {rate}×
              </MenuItem>
            ))}
          </TextField>
          <Button onClick={stop} disabled={status === 'stopped'}>
            Стоп
          </Button>
        </Box>
      )}
      {message && (
        <Typography role="status" variant="body2">
          {message}
        </Typography>
      )}
      {error && (
        <Typography role="alert" color="error">
          {error}
        </Typography>
      )}
    </>
  )
}
