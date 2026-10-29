import { useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import type { IWord } from '../../../entities/word'
import { loadPiperSelections, type PiperSelections } from '../../../shared/lib/tts/piper'
import { useSessionPlayer } from '../model/useSessionPlayer'

export default function SessionPlayer({ words, intervalSeconds }: { words: IWord[]; intervalSeconds: number }) {
  const [voices] = useState(loadPiperSelections)
  return (
    <Box sx={{ mb: 3 }}>
      <Typography>Прослушивание по кругу. Интервал: {intervalSeconds} сек.</Typography>
      <Playback key={JSON.stringify([words.map((word) => [word._id, word.original, word.translation, word.sourceLanguage, word.targetLanguage, word.hasRecording, word.updatedAt]), intervalSeconds, voices])}
        words={words} intervalSeconds={intervalSeconds} voices={voices} />
      <Typography variant="body2">
        Сначала подготовьте аудио с открытым экраном, затем нажмите «Запустить».
        Своя запись перевода имеет приоритет. Пауза сохраняет точное место воспроизведения.
        Готовая озвучка сохраняется в браузере; после очистки данных сайта её потребуется подготовить заново.
      </Typography>
      <Typography variant="caption"><a href={`${import.meta.env.BASE_URL}licenses/piper/index.html`} target="_blank" rel="noreferrer">Лицензии и исходники Piper</a></Typography>
    </Box>
  )
}

function Playback({ words, intervalSeconds, voices }: { words: IWord[]; intervalSeconds: number; voices: PiperSelections }) {
  const { status, progress, error, message, ready, audioRef, prepare, play, pause, stop } = useSessionPlayer(words, intervalSeconds, voices)
  const word = words[progress.index]
  return (
    <>
      <audio ref={audioRef} loop preload="metadata" />
      <Typography>
        {status === 'preparing' ? 'Подготовка' : status === 'playing' ? 'Воспроизводится' : status === 'paused' ? 'На паузе' : ready ? 'Готово' : 'Остановлено'}
        {word ? ` · ${progress.index + 1} / ${words.length}: ${word.original} — ${word.translation}` : ' · Добавьте слова для прослушивания.'}
        {status === 'playing' && progress.phase === 'waiting' && ' · Интервал'}
      </Typography>
      <Button onClick={() => { void (ready ? play() : prepare()) }} disabled={status === 'playing' || status === 'preparing' || !words.length}>
        {status === 'preparing' ? 'Подготовка…' : status === 'paused' ? 'Продолжить' : ready ? 'Запустить' : 'Подготовить аудио'}
      </Button>
      <Button onClick={pause} disabled={status !== 'playing'}>Пауза</Button>
      <Button onClick={stop} disabled={status === 'stopped'}>Стоп</Button>
      {message && <Typography role="status" variant="body2">{message}</Typography>}
      {error && <Typography role="alert" color="error">{error}</Typography>}
    </>
  )
}
