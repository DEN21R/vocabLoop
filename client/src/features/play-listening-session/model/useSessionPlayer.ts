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
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const preparation = useRef<AbortController | null>(null)
  const track = useRef<{ url: string; cues: SessionCue[] } | null>(null)
  const statusRef = useRef<Status>('stopped')

  function changeStatus(next: Status) { statusRef.current = next; setStatus(next) }
  function cancelPreparation() {
    preparation.current?.abort()
    preparation.current = null
  }
  function releaseTrack() {
    if (track.current) URL.revokeObjectURL(track.current.url)
    track.current = null
  }

  function stop() {
    cancelPreparation()
    changeStatus('stopped')
    audioRef.current?.pause()
    if (audioRef.current?.src) audioRef.current.currentTime = 0
    setProgress(START); setMessage(''); setError('')
  }

  async function prepare() {
    if (preparation.current || !words.length) return
    const controller = new AbortController()
    preparation.current = controller
    changeStatus('preparing'); setError(''); setMessage('Подготовка аудио…')
    try {
      const result = await buildSessionTrack(words, intervalSeconds, voices, controller.signal, (value) => {
        if (preparation.current === controller) setMessage(value)
      })
      if (preparation.current !== controller) return
      const url = URL.createObjectURL(result.audio)
      track.current = { url, cues: result.cues }
      audioRef.current!.src = url
      audioRef.current!.load()
      setReady(true); changeStatus('ready'); setMessage('Аудио готово. Нажмите ▶ в плеере.')
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
    const update = () => {
      const cue = track.current && sessionPosition(track.current.cues, audio.currentTime)
      if (cue) setProgress((previous) => previous.index === cue.index && previous.phase === cue.phase ? previous : { index: cue.index, phase: cue.phase })
    }
    const playing = () => {
      if (!audio.paused) { changeStatus('playing'); setError(''); setMessage('') }
    }
    const paused = () => { if (audio.paused && statusRef.current === 'playing') changeStatus('paused') }
    const failed = () => {
      audio.pause(); changeStatus('stopped')
      setError(`Не удалось воспроизвести аудиотрек (${audio.error?.message || audio.error?.code || 'ошибка аудио'}).`)
      releaseTrack(); setReady(false)
      audio.removeAttribute('src'); audio.load()
    }
    audio.addEventListener('timeupdate', update)
    audio.addEventListener('play', playing)
    audio.addEventListener('pause', paused)
    audio.addEventListener('error', failed)
    return () => {
      cancelPreparation()
      audio.removeEventListener('timeupdate', update)
      audio.removeEventListener('play', playing)
      audio.removeEventListener('pause', paused)
      audio.removeEventListener('error', failed)
      audio.pause(); audio.removeAttribute('src'); audio.load()
      releaseTrack()
    }
  }, [])

  return { status, progress, error, message, ready, audioRef, prepare, stop }
}
