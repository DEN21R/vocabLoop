import { useEffect, useRef, useState } from 'react'
import { getRecording, type IWord } from '../../../entities/word'
import { playAudio, unlockAudio } from '../../../shared/lib/audio/playAudio'
import { prepareSpeech, speakText, stopSpeech } from '../../../shared/lib/tts/speech'

type Status = 'stopped' | 'playing' | 'paused'
type Phase = 'original' | 'translation' | 'waiting'

export function useSessionPlayer(words: IWord[], intervalSeconds: number) {
  const [status, setStatus] = useState<Status>('stopped')
  const [progress, setProgress] = useState<{ index: number; phase: Phase }>({ index: 0, phase: 'original' })
  const [error, setError] = useState('')
  const position = useRef({ index: 0, phase: 'original' as Phase })
  const statusRef = useRef<Status>('stopped')
  // Каждый запуск получает номер: завершения старого запуска игнорируются.
  const runId = useRef(0)
  const intervalRef = useRef(intervalSeconds)
  const remaining = useRef(0)
  const waitStarted = useRef(0)
  const waitRef = useRef<{ timer: ReturnType<typeof setTimeout>; finish: () => void } | null>(null)
  const audioRef = useRef<ReturnType<typeof playAudio> | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => { intervalRef.current = intervalSeconds }, [intervalSeconds])

  function cancelRun() {
    runId.current += 1
    if (waitRef.current) {
      clearTimeout(waitRef.current.timer)
      waitRef.current.finish()
      waitRef.current = null
    }
    stopSpeech()
    audioRef.current?.stop()
    audioRef.current = null
  }

  function stop() {
    cancelRun()
    statusRef.current = 'stopped'
    position.current = { index: 0, phase: 'original' }
    remaining.current = 0
    setProgress(position.current)
    setStatus('stopped')
  }

  function pause() {
    if (statusRef.current !== 'playing') return
    if (waitRef.current) {
      remaining.current = Math.max(0, remaining.current - (performance.now() - waitStarted.current))
    }
    cancelRun()
    statusRef.current = 'paused'
    setStatus('paused')
  }

  async function play() {
    if (statusRef.current === 'playing' || words.length === 0) return
    const currentRun = ++runId.current
    statusRef.current = 'playing'
    setStatus('playing')
    setError('')

    try {
      // Must call play() before any await while handling the user's click.
      // Handle rejection immediately; report it when the recording phase starts.
      let audioReady: Promise<unknown> = Promise.resolve(null)
      if (words.some((word) => word.hasRecording)) {
        const element = audioElementRef.current ?? new Audio()
        audioElementRef.current = element
        const unlock = unlockAudio(element)
        audioRef.current = unlock
        audioReady = unlock.finished.then(() => null, (error: unknown) => error)
      }

      await prepareSpeech(words.flatMap((word) =>
        word.hasRecording ? [word.sourceLanguage] : [word.sourceLanguage, word.targetLanguage],
      ))
      if (currentRun !== runId.current) return

      // Используем те же голоса, которые выбраны на странице слов.
      const voices: Record<string, string> = JSON.parse(localStorage.getItem('selectedVoices') || '{}')

      while (currentRun === runId.current) {
        const { index, phase } = position.current
        const word = words[index]
        setProgress({ index, phase })

        if (phase === 'waiting') {
          await new Promise<void>((resolve) => {
            waitStarted.current = performance.now()
            waitRef.current = { timer: setTimeout(resolve, remaining.current), finish: resolve }
          })
          if (currentRun !== runId.current) return
          waitRef.current = null
          remaining.current = 0
          position.current = { index: (index + 1) % words.length, phase: 'original' }
        } else {
          if (phase === 'translation' && word.hasRecording) {
            const unlockError = await audioReady
            if (currentRun !== runId.current) return
            if (unlockError) throw unlockError
            const recording = await getRecording(word._id)
            if (currentRun !== runId.current) return
            const audio = playAudio(recording, audioElementRef.current!)
            audioRef.current = audio
            await audio.finished
            if (currentRun !== runId.current) return
            audioRef.current = null
          } else {
            const language = phase === 'original' ? word.sourceLanguage : word.targetLanguage
            const result = await speakText({
              text: phase === 'original' ? word.original : word.translation,
              language,
              voiceURI: voices[language],
            })
            if (currentRun !== runId.current) return
            if (result === 'cancelled') {
              stop()
              return
            }
          }
          position.current = { index, phase: phase === 'original' ? 'translation' : 'waiting' }
          if (phase === 'translation') remaining.current = intervalRef.current * 1000
        }
      }
    } catch (error) {
      if (currentRun !== runId.current) return
      stop()
      setError(error instanceof Error ? error.message : 'Не удалось запустить озвучивание')
    }
  }

  useEffect(() => {
    // Страница пересоздаёт плеер при изменении состава или порядка слов.
    return () => {
      runId.current += 1
      if (waitRef.current) {
        clearTimeout(waitRef.current.timer)
        waitRef.current.finish()
        waitRef.current = null
      }
      if (statusRef.current !== 'stopped') stopSpeech()
      audioRef.current?.stop()
      audioRef.current = null
      audioElementRef.current = null
    }
  }, [])

  return { status, progress, error, play, pause, stop }
}
