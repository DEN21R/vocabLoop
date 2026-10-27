import { useEffect, useRef, useState } from 'react'
import { getRecording, type IWord } from '../../../entities/word'
import {
  prepareSpeech,
  speakText,
  stopSpeech,
} from '../../../shared/lib/tts/speech'
import { playAudio } from '../../../shared/lib/audio/playAudio'

type SelectedVoices = {
  en: string
  ru: string
  de: string
  uk: string
}

export function useWordPlayback(selectedVoices: SelectedVoices) {
  const [activeWordId, setActiveWordId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const playbackRef = useRef<{ cancelled: boolean } | null>(null)
  const audioRef = useRef<ReturnType<typeof playAudio> | null>(null)

  function getVoiceForLanguage(language: string) {
    if (language === 'en') {
      return selectedVoices.en
    } else if (language === 'ru') {
      return selectedVoices.ru
    } else if (language === 'de') {
      return selectedVoices.de
    } else if (language === 'uk') {
      return selectedVoices.uk
    } else {
      return ''
    }
  }
  const playWord = async (
    word: IWord,
    translationSource: 'tts' | 'recording' = 'tts',
  ) => {
    // Не запускаем второе слово, пока заняты первым.
    if (playbackRef.current) return

    const playback = { cancelled: false }
    playbackRef.current = playback

    setActiveWordId(word._id)
    setError(null)

    try {
      let recordingBlob: Blob | null = null

      if (translationSource === 'recording') {
        recordingBlob = await getRecording(word._id)

        if (playback.cancelled) return
      }

      await prepareSpeech(
        translationSource === 'recording' ?
          [word.sourceLanguage]
        : [word.sourceLanguage, word.targetLanguage],
      )

      // Пользователь мог нажать «Стоп» во время подготовки.
      if (playback.cancelled) return

      const result = await speakText({
        text: word.original,
        language: word.sourceLanguage,
        voiceURI: getVoiceForLanguage(word.sourceLanguage),
      })

      // После остановки оригинала перевод не запускаем.
      if (playback.cancelled || result === 'cancelled') return

      if (recordingBlob) {
        const player = playAudio(recordingBlob)
        audioRef.current = player
        await player.finished
      } else {
        await speakText({
          text: word.translation,
          language: word.targetLanguage,
          voiceURI: getVoiceForLanguage(word.targetLanguage),
        })
      }
    } catch (error) {
      if (!playback.cancelled) {
        setError(
          error instanceof Error ? error.message : 'Не удалось озвучить слово',
        )
      }
    } finally {
      audioRef.current?.stop()
      audioRef.current = null
      if (playbackRef.current === playback) {
        playbackRef.current = null
        setActiveWordId(null)
      }
    }
  }

  const stop = () => {
    if (!playbackRef.current) return

    playbackRef.current.cancelled = true
    stopSpeech()
    audioRef.current?.stop()
  }

  useEffect(() => {
    return () => {
      if (playbackRef.current) {
        playbackRef.current.cancelled = true
        playbackRef.current = null
        stopSpeech()
        audioRef.current?.stop()
      }
    }
  }, [])

  return {
    playWord,
    stop,
    activeWordId,
    isPlaying: activeWordId !== null,
    error,
  }
}
