import { useEffect, useRef, useState } from 'react'
import { getRecording, type IWord } from '../../../entities/word'
import { getPiperAudio } from '../../../shared/lib/tts/piperAudio'
import { piperLanguage, type PiperSelections } from '../../../shared/lib/tts/piper'

export function useWordPlayback(selectedVoices: PiperSelections) {
  const [activeWordId, setActiveWordId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const playbackRef = useRef<{ controller: AbortController; context: AudioContext | null } | null>(null)

  async function playWord(word: IWord, translationSource: 'tts' | 'recording' = 'tts') {
    if (playbackRef.current) return
    const playback = { controller: new AbortController(), context: null as AudioContext | null }
    const signal = playback.controller.signal
    playbackRef.current = playback
    setActiveWordId(word._id); setError(null)
    try {
      const context = new AudioContext()
      playback.context = context
      // Resume directly from the click, before downloading or generating audio.
      // Word previews use Web Audio in the foreground; sessions use HTML Audio.
      await context.resume()
      const recording = translationSource === 'recording' ? await getRecording(word._id) : null
      for (const phase of ['original', 'translation'] as const) {
        signal.throwIfAborted()
        let audio: Blob
        if (phase === 'translation' && recording) audio = recording
        else {
          const language = piperLanguage(phase === 'original' ? word.sourceLanguage : word.targetLanguage)
          audio = await getPiperAudio({ language, voice: selectedVoices[language], text: phase === 'original' ? word.original : word.translation }, signal, () => {})
        }
        signal.throwIfAborted()
        const buffer = await context.decodeAudioData(await audio.arrayBuffer())
        signal.throwIfAborted()
        await new Promise<void>((resolve, reject) => {
          const source = context.createBufferSource()
          source.buffer = buffer
          source.connect(context.destination)
          function finish() {
            signal.removeEventListener('abort', finish)
            source.onended = null
            source.disconnect()
            resolve()
          }
          source.onended = finish
          signal.addEventListener('abort', finish, { once: true })
          try { source.start() }
          catch (cause) { reject(cause); finish() }
        })
      }
    } catch (cause) {
      if (!signal.aborted) setError(cause instanceof Error ? cause.message : 'Не удалось озвучить слово')
    } finally {
      if (playback.context?.state !== 'closed') await playback.context?.close().catch(() => {})
      if (playbackRef.current === playback) {
        playbackRef.current = null
        setActiveWordId(null)
      }
    }
  }

  function stop() {
    const playback = playbackRef.current
    playback?.controller.abort()
    if (playback?.context?.state !== 'closed') void playback?.context?.close().catch(() => {})
  }

  useEffect(() => () => {
    stop()
    playbackRef.current = null
  }, [])

  return { playWord, stop, activeWordId, isPlaying: activeWordId !== null, error }
}
