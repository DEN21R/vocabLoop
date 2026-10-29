import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, MenuItem, TextField, Typography } from '@mui/material'
import { PIPER_VOICES, getPiperVoice, loadPiperSelections, savePiperSelections, piperError, type PiperLanguage, type PiperReply } from '../model/piperProbe'

export function PiperAudioProbe() {
  const [language, setLanguage] = useState<PiperLanguage>('en')
  const [selections, setSelections] = useState(loadPiperSelections)
  const selectedVoice = getPiperVoice(language, selections[language])!
  const [text, setText] = useState<string>(PIPER_VOICES.en.word)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const task = useRef<{ worker: Worker; timer: ReturnType<typeof setTimeout> } | null>(null)
  const lastStatus = useRef('')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  function clearResult() {
    audioRef.current?.pause()
    audioRef.current?.removeAttribute('src')
    audioRef.current?.load()
    setAudioUrl(''); setStatus(''); setError('')
  }

  function dispose() {
    if (!task.current) return
    task.current.worker.terminate()
    clearTimeout(task.current.timer)
    task.current = null
  }
  useEffect(() => () => dispose(), [])
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl) }, [audioUrl])

  function generate() {
    if (task.current) return
    clearResult()
    if (!window.isSecureContext || typeof Worker === 'undefined' || typeof WebAssembly === 'undefined' || typeof BigInt64Array === 'undefined') {
      setError('Для Piper нужны HTTPS и современный браузер с WebAssembly и Web Workers.')
      return
    }
    dispose()
    lastStatus.current = 'Запуск Worker'
    setBusy(true)
    setStatus('Загрузка Piper и выбранной модели, затем генерация. Первый запуск может занять несколько минут…')
    function fail(message: string) {
      dispose(); setBusy(false); setStatus(''); setError(message)
    }
    try {
      const worker = new Worker(new URL('../model/piperProbe.worker.ts', import.meta.url), { type: 'module' })
      const timer = setTimeout(() => fail(piperError(new Error(`Генерация не завершилась за 3 минуты. Последнее действие: ${lastStatus.current}`), { language, voice: selectedVoice.id, stage: 'timeout' })), 180_000)
      task.current = { worker, timer }
      worker.onerror = (event) => {
        event.preventDefault()
        if (task.current?.worker === worker) fail(piperError(event.error ?? new Error(event.message || 'Worker error without message'), { language, voice: selectedVoice.id, stage: 'worker' }))
      }
      worker.onmessageerror = () => {
        if (task.current?.worker === worker) fail('Браузер не смог получить результат Piper из Web Worker.')
      }
      worker.onmessage = ({ data }: MessageEvent<PiperReply>) => {
        if (task.current?.worker !== worker) return
        if (data.type === 'status') { lastStatus.current = data.message; setStatus(data.message) }
        else if (data.type === 'error') fail(data.message)
        else {
          dispose(); setBusy(false)
          setAudioUrl(URL.createObjectURL(data.audio))
          setStatus('Готово. Нажмите ▶ в аудиоплеере, чтобы прослушать результат.')
        }
      }
      worker.postMessage({ language, text, voice: selectedVoice.id })
    } catch (cause) { fail(piperError(cause, { language, voice: selectedVoice.id, stage: 'worker' })) }
  }

  return (
    <Box component="details" sx={{ my: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
      <Typography component="summary">Временная проверка Piper в браузере</Typography>
      <Typography variant="body2" sx={{ my: 1 }}>
        Сначала остановите сессию и тест MP3. Загружается только выбранный голос (около 60–80 МБ) и WASM.
        Генерацию выполняйте с открытым экраном. Кэш используется, если браузер позволяет, и может быть очищен браузером.
        При нехватке памяти Safari может перезагрузить вкладку без сообщения.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', my: 2 }}>
        <TextField select label="Язык Piper" value={language} disabled={busy} sx={{ minWidth: 150 }}
          onChange={(event) => {
            if (task.current) return
            const next = event.target.value as PiperLanguage
            setLanguage(next); setText(PIPER_VOICES[next].word); clearResult()
          }}>
          {Object.entries(PIPER_VOICES).map(([key, voice]) => <MenuItem key={key} value={key}>{voice.name}</MenuItem>)}
        </TextField>
        <TextField select label="Голос" value={selectedVoice.id} disabled={busy} sx={{ minWidth: 240 }}
          onChange={(event) => {
            if (task.current || !getPiperVoice(language, event.target.value)) return
            const next = { ...selections, [language]: event.target.value }
            setSelections(next); savePiperSelections(next); clearResult()
          }}>
          {PIPER_VOICES[language].voices.map((voice) => <MenuItem key={voice.id} value={voice.id}>{voice.label}</MenuItem>)}
        </TextField>
        <TextField label="Короткое слово" value={text} disabled={busy} slotProps={{ htmlInput: { maxLength: 60 } }}
          onChange={(event) => { if (!task.current) { setText(event.target.value); clearResult() } }} />
      </Box>
      <Typography variant="caption" sx={{ display: 'block' }}>Модель: {selectedVoice.modelId}{selectedVoice.speaker ? ` · ${selectedVoice.speaker}` : ''}</Typography>
      <Button disabled={busy || !text.trim()} onClick={generate}>Сгенерировать Piper</Button>
      {busy && <Button onClick={() => { dispose(); setBusy(false); setStatus('Проверка отменена.') }}>Отменить</Button>}
      {status && <Typography role="status" variant="body2">{status}</Typography>}
      {error && <Alert severity="error">{error}</Alert>}
      {audioUrl && <audio ref={audioRef} key={audioUrl} controls src={audioUrl} preload="metadata" style={{ width: '100%', marginTop: 12 }} />}
      <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
        Это проверка одного слова, основной проигрыватель не заменён. <a href={`${import.meta.env.BASE_URL}licenses/piper/index.html`} target="_blank" rel="noreferrer">Лицензии и исходники Piper</a>
      </Typography>
    </Box>
  )
}
