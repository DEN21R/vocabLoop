import { useEffect, useRef, useState } from 'react'
import type { IWord } from '../../../entities/word'
import type { PiperSelections } from '../../../shared/lib/tts/piper'
import { buildSessionTrack, sessionPosition, type SessionCue } from './sessionTrack'

type Status = 'stopped' | 'preparing' | 'ready' | 'playing' | 'paused'
const START = { index: 0, phase: 'original' as SessionCue['phase'] }

export function useSessionPlayer(words: IWord[], intervalSeconds: number, voices: PiperSelections) {
  const [status, setStatus] = useState<Status>('stopped')
  const [progress, setProgress] = useState(START)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [ready, setReady] = useState(false)
  const [diagnostics, setDiagnostics] = useState<string[]>([])
  const [downloadUrl, setDownloadUrl] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const preparation = useRef<AbortController | null>(null)
  const track = useRef<{ url: string; cues: SessionCue[] } | null>(null)
  const statusRef = useRef<Status>('stopped')
  const playerLoadStarted = useRef<number | null>(null)

  function playerSnapshot(event: string) {
    const audio = audioRef.current
    return `PLAYER_${event} ${JSON.stringify({
      ms: playerLoadStarted.current === null ? null : Math.round(performance.now() - playerLoadStarted.current),
      readyState: audio?.readyState, networkState: audio?.networkState,
      duration: audio && Number.isFinite(audio.duration) ? audio.duration : null,
      paused: audio?.paused, hidden: audio?.hidden, preload: audio?.preload,
      source: 'blob-url',
      sourceMatchesTrack: !!track.current && audio?.currentSrc === track.current.url,
      visibility: document.visibilityState,
      error: audio?.error ? { code: audio.error.code, message: audio.error.message } : null,
    })}`
  }

  function changeStatus(next: Status) { statusRef.current = next; setStatus(next) }
  function cancelPreparation() {
    preparation.current?.abort()
    preparation.current = null
  }
  function releaseTrack() {
    if (track.current) URL.revokeObjectURL(track.current.url)
    track.current = null
    setDownloadUrl('')
  }

  function stop() {
    cancelPreparation()
    changeStatus('stopped')
    audioRef.current?.pause()
    if (audioRef.current && audioRef.current.readyState > 0) audioRef.current.currentTime = 0
    setProgress(START); setMessage(''); setError('')
  }

  async function prepare() {
    if (preparation.current || !words.length) return
    const controller = new AbortController()
    const started = performance.now()
    playerLoadStarted.current = null
    preparation.current = controller
    setDiagnostics([`Подготовка: ${new Date().toISOString()}; слов: ${words.length}`])
    changeStatus('preparing'); setError(''); setMessage('Подготовка аудио…')
    try {
      const result = await buildSessionTrack(words, intervalSeconds, voices, controller.signal, (value) => {
        if (preparation.current === controller) setMessage(value)
      }, (line) => {
        if (preparation.current === controller) setDiagnostics((previous) => [...previous, line])
      })
      if (preparation.current !== controller) return
      setDiagnostics((previous) => [...previous, `TRACK_BUILT ${JSON.stringify({ ms: Math.round(performance.now() - started), bytes: result.audio.size })}`])
      const url = URL.createObjectURL(result.audio)
      track.current = { url, cues: result.cues }
      setDownloadUrl(url)
      playerLoadStarted.current = performance.now()
      audioRef.current!.src = url
      setMessage('Загрузка трека в плеер…')
      audioRef.current!.load()
      const snapshot = playerSnapshot('LOAD_CALLED')
      setDiagnostics((previous) => [...previous, snapshot])
    } catch (cause) {
      if (preparation.current !== controller) return
      changeStatus('stopped'); setMessage('')
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      if (preparation.current === controller) preparation.current = null
    }
  }

  useEffect(() => {
    const audio = audioRef.current!
    audio.loop = true
    const diagnosticEvents = ['loadstart', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough', 'suspend', 'stalled', 'waiting', 'error', 'abort', 'emptied', 'playing', 'pause']
    const logPlayerEvent = (event: Event) => {
      if (playerLoadStarted.current === null) return
      const snapshot = playerSnapshot(event.type.toUpperCase())
      setDiagnostics((previous) => [...previous, snapshot])
    }
    for (const event of diagnosticEvents) audio.addEventListener(event, logPlayerEvent)
    const update = () => {
      const cue = track.current && sessionPosition(track.current.cues, audio.currentTime)
      if (cue) setProgress((previous) => previous.index === cue.index && previous.phase === cue.phase ? previous : { index: cue.index, phase: cue.phase })
    }
    const metadataLoaded = () => {
      if (track.current && audio.currentSrc === track.current.url && statusRef.current === 'preparing' && Number.isFinite(audio.duration) && audio.duration > 0 && !audio.error) {
        setReady(true); changeStatus('ready'); setMessage('Трек подготовлен. Нажмите ▶ в плеере.')
      }
    }
    const playing = () => {
      if (!audio.paused) { changeStatus('playing'); setError(''); setMessage('') }
    }
    const paused = () => { if (audio.paused && statusRef.current === 'playing') changeStatus('paused') }
    const failed = () => {
      audio.pause(); changeStatus('stopped'); setMessage('')
      setError(`Не удалось воспроизвести аудиотрек (${audio.error?.message || audio.error?.code || 'ошибка аудио'}).`)
      releaseTrack(); setReady(false)
      audio.removeAttribute('src'); audio.load()
    }
    audio.addEventListener('timeupdate', update)
    audio.addEventListener('loadedmetadata', metadataLoaded)
    audio.addEventListener('playing', playing)
    audio.addEventListener('pause', paused)
    audio.addEventListener('error', failed)
    return () => {
      cancelPreparation()
      for (const event of diagnosticEvents) audio.removeEventListener(event, logPlayerEvent)
      audio.removeEventListener('timeupdate', update)
      audio.removeEventListener('loadedmetadata', metadataLoaded)
      audio.removeEventListener('playing', playing)
      audio.removeEventListener('pause', paused)
      audio.removeEventListener('error', failed)
      audio.pause()
      releaseTrack()
      audio.removeAttribute('src'); audio.load()
    }
  }, [])

  const getDiagnostics = () => [...diagnostics, playerSnapshot('COPY_STATE')]
  return { status, progress, error, message, ready, audioRef, prepare, stop, diagnostics, getDiagnostics, downloadUrl }
}
