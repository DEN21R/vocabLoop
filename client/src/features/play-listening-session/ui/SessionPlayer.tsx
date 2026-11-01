import { useEffect, useState } from 'react'
import { Box, Button, MenuItem, TextField, Typography } from '@mui/material'
import type { IWord } from '../../../entities/word'
import {
  loadPiperSelections,
  type PiperSelections,
} from '../../../shared/lib/tts/piper'
import { useSessionPlayer } from '../model/useSessionPlayer'
import ramStopImage from '../../../shared/assets/ramStop.png'

export default function SessionPlayer({
  words,
  intervalSeconds,
  onActiveWordChange,
}: {
  words: IWord[]
  intervalSeconds: number
  onActiveWordChange: (wordId: string | null) => void
}) {
  const [voices] = useState(loadPiperSelections)
  return (
    <Box sx={{ mb: 3 }}>
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
        onActiveWordChange={onActiveWordChange}
      />
    </Box>
  )
}

function Playback({
  words,
  intervalSeconds,
  voices,
  onActiveWordChange,
}: {
  words: IWord[]
  intervalSeconds: number
  voices: PiperSelections
  onActiveWordChange: (wordId: string | null) => void
}) {
  const { status, progress, error, message, ready, audioRef, prepare, stop, diagnostics } =
    useSessionPlayer(words, intervalSeconds, voices)
  const [copyMessage, setCopyMessage] = useState('')
  const [speed, setSpeed] = useState(1)
  const [stopCount, setStopCount] = useState(0)
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
  const activeWordId =
    status === 'playing' ? (words[progress.index]?._id ?? null) : null

  useEffect(() => {
    onActiveWordChange(activeWordId)
    return () => onActiveWordChange(null)
  }, [activeWordId, onActiveWordChange])

  return (
    <>
      <Button
        sx={{
          color: '#f78811',
          border: '2px #f78811 solid',
          borderRadius: '12px',
          mt: 2,
        }}
        onClick={() => {
          setCopyMessage('')
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
      {diagnostics.length > 0 && (
        <Box sx={{ mt: 1, p: 1.5, backgroundColor: '#fff4e5', color: '#5d2c07', borderRadius: 2 }}>
          <Typography variant="body2">Временная диагностика Piper · время в мс</Typography>
          <Button
            size="small"
            sx={{ color: '#a75108' }}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(diagnostics.join('\n'))
                setCopyMessage('Скопировано')
              } catch {
                setCopyMessage('Выделите и скопируйте текст ниже')
              }
            }}
          >
            Скопировать
          </Button>
          {copyMessage && <Typography role="status" variant="body2">{copyMessage}</Typography>}
          <Box component="pre" sx={{ m: 0, maxHeight: 180, overflow: 'auto', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 11, userSelect: 'text' }}>
            {diagnostics.join('\n')}
          </Box>
        </Box>
      )}
      <audio
        ref={audioRef}
        controls
        loop
        preload="auto"
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
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <Button
              sx={{
                backgroundColor: '#f78811',
                color: '#fff',

                borderRadius: '50%',
                width: 56,
                height: 56,
                minWidth: 56,
                p: 0,
              }}
              onClick={() => {
                stop()
                setStopCount((count) => count + 1)
              }}
              disabled={status === 'stopped'}
            >
              Стоп
            </Button>
            {stopCount > 0 && (
              <Box
                key={stopCount}
                component="img"
                src={ramStopImage}
                alt=""
                aria-hidden="true"
                sx={{
                  position: 'absolute',
                  left: 150,
                  top: 30,
                  bottom: 'calc(100% + 8px)',
                  transform: 'translateX(-50%)',
                  width: 180,
                  height: 120,
                  objectFit: 'contain',
                  pointerEvents: 'none',
                  zIndex: 1,
                  animation: 'stopRamFade 8s ease-in-out 0.5s both',
                  '@keyframes stopRamFade': {
                    '0%, 100%': { opacity: 0 },
                    '12.5%, 87.5%': { opacity: 1 },
                  },
                }}
              />
            )}
          </Box>
        </Box>
      )}
      {message && (
        <Typography
          role="status"
          sx={{ color: '#5d2c07', fontWeight: 'bold', fontSize: '1rem' }}
        >
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
