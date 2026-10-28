type SpeechResult = 'finished' | 'cancelled'

let activeSpeech: {
  utterance: SpeechSynthesisUtterance
  cancel: () => void
} | null = null

export function normalizeLanguage(language: string): string {
  return language.trim().replace(/_/g, '-').toLowerCase()
}

export function getVoicesByLanguage(voices: SpeechSynthesisVoice[], language: string): SpeechSynthesisVoice[] {
  const baseLanguage = normalizeLanguage(language).split('-')[0]
  return voices.filter((voice) => normalizeLanguage(voice.lang).split('-')[0] === baseLanguage)
}

function findVoice(voices: SpeechSynthesisVoice[], language: string): SpeechSynthesisVoice | undefined {
  return voices.find((voice) => normalizeLanguage(voice.lang) === normalizeLanguage(language)) ??
    getVoicesByLanguage(voices, language)[0]
}

export async function prepareSpeech(languages: string[]): Promise<void> {
  if (
    !('speechSynthesis' in window) ||
    !('SpeechSynthesisUtterance' in window)
  ) {
    throw new Error('Браузер не поддерживает озвучивание')
  }
  const missingLanguage = (voices: SpeechSynthesisVoice[]) => languages.find((language) => !findVoice(voices, language))
  if (missingLanguage(window.speechSynthesis.getVoices()) !== undefined) {
    await new Promise<void>((res, rej) => {
      const synth = window.speechSynthesis

      const cleanup = () => {
        clearTimeout(timer)
        clearInterval(poll)
        synth.removeEventListener('voiceschanged', checkVoices)
      }
      const checkVoices = () => {
        const loadedVoices = synth.getVoices()

        if (missingLanguage(loadedVoices) === undefined) {
          cleanup()
          res()
        }
      }

      const poll = setInterval(checkVoices, 500)
      const timer = setTimeout(() => {
        const loadedVoices = synth.getVoices()
        const missing = missingLanguage(loadedVoices)
        cleanup()
        if (missing === undefined) res()
        else rej(new Error(loadedVoices.length === 0 ? 'Браузер не предоставил голоса. Проверьте системный TTS и повторите попытку.' : `Нет голоса для языка: ${missing}`))
      }, 10000)

      synth.addEventListener('voiceschanged', checkVoices)
      checkVoices()
    })
  }
}

export function speakText({
  text,
  language,
  voiceURI,
}: {
  text: string
  language: string
  voiceURI?: string
}): Promise<SpeechResult> {
  return new Promise((resolve, reject) => {
    if (activeSpeech) {
      reject(new Error('Дождись окончания текущей реплики'))
      return
    }

    const voices = window.speechSynthesis.getVoices()

    const selectedVoice = voices.find((condidate) => {
      return condidate.voiceURI === voiceURI
    })

    const voice = selectedVoice ?? findVoice(voices, language)

    if (!voice) {
      reject(new Error(`Нет голоса для языка: ${language}`))
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)

    utterance.voice = voice
    utterance.lang = normalizeLanguage(voice.lang)

    let settled = false
    let started = false
    let elapsed = 0
    const timeoutMs = Math.max(30000, text.length * 500)

    const cleanup = () => {
      clearInterval(watchdog)
      utterance.onstart = null
      utterance.onend = null
      utterance.onerror = null

      if (activeSpeech?.utterance === utterance) {
        activeSpeech = null
      }
    }

    const finish = (result: SpeechResult) => {
      if (settled) return

      settled = true
      cleanup()
      resolve(result)
    }

    const fail = (error: Error) => {
      if (settled) return

      settled = true
      cleanup()
      reject(error)
    }

    // Some speech engines finish speaking without delivering the end event.
    // Only recover after start, so a queued utterance is never skipped.
    const watchdog = setInterval(() => {
      const synth = window.speechSynthesis
      if (synth.paused) return

      if (started && !synth.speaking && !synth.pending) {
        finish('finished')
        return
      }

      elapsed += 250
      if (elapsed >= timeoutMs) {
        fail(new Error('Движок озвучивания не ответил. Запустите воспроизведение снова.'))
        synth.cancel()
        synth.resume()
      }
    }, 250)

    utterance.onstart = () => {
      started = true
    }

    utterance.onend = () => {
      finish('finished')
    }

    utterance.onerror = (event) => {
      // Browsers can report cancel() as either canceled or interrupted.
      // Neither means that the voice or the speech engine failed.
      if (event.error === 'canceled' || event.error === 'interrupted') {
        finish('cancelled')
        return
      }
      fail(new Error(`Ошибка озвучивания: ${event.error}`))
    }

    activeSpeech = {
      utterance,
      cancel: () => finish('cancelled'),
    }
    try {
      window.speechSynthesis.speak(utterance)
    } catch (error) {
      fail(error instanceof Error ? error : new Error('Не удалось запустить озвучивание'))
    }
  })
}

export function stopSpeech(): void {
  activeSpeech?.cancel()

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    window.speechSynthesis.resume()
  }
}

export function pauseSpeech(): void {
  console.log('Нажата пауза. Активная реплика:', activeSpeech)

  if (!activeSpeech) return

  window.speechSynthesis.pause()
}

export function resumeSpeech(): void {
  if (!activeSpeech) return

  window.speechSynthesis.resume()
}

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) {
    return []
  }
  return window.speechSynthesis.getVoices()
}
