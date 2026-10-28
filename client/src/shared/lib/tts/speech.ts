type SpeechResult = 'finished' | 'cancelled'

let activeSpeech: {
  utterance: SpeechSynthesisUtterance
  cancel: () => void
} | null = null

export async function prepareSpeech(languages: string[]): Promise<void> {
  if (
    !('speechSynthesis' in window) ||
    !('SpeechSynthesisUtterance' in window)
  ) {
    throw new Error('Браузер не поддерживает озвучивание')
  }
  let voices = window.speechSynthesis.getVoices()

  if (voices.length === 0) {
    voices = await new Promise<SpeechSynthesisVoice[]>((res, rej) => {
      const synth = window.speechSynthesis

      const cleanup = () => {
        clearTimeout(timer)
        synth.removeEventListener('voiceschanged', checkVoices)
      }
      const checkVoices = () => {
        const loadedVoices = synth.getVoices()

        if (loadedVoices.length > 0) {
          cleanup()
          res(loadedVoices)
        }
      }

      const timer = setTimeout(() => {
        cleanup()
        rej(new Error('Не удалось загрузить голоса'))
      }, 3000)

      synth.addEventListener('voiceschanged', checkVoices)
      checkVoices()
    })
  }

  for (const language of languages) {
    const normalizedLanguage = language.toLowerCase()

    const voice =
      voices.find((voice) => voice.lang.toLowerCase() === normalizedLanguage) ??
      voices.find(
        (voice) =>
          voice.lang.toLowerCase().split('-')[0] ===
          normalizedLanguage.split('-')[0],
      )
    if (!voice) {
      throw new Error(`Нет голоса для языка: ${language}`)
    }
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

    const normalizedLanguage = language.toLowerCase()

    const selectedVoice = voices.find((condidate) => {
      return condidate.voiceURI === voiceURI
    })

    const voice =
      selectedVoice ??
      voices.find((voice) => voice.lang.toLowerCase() === normalizedLanguage) ??
      voices.find(
        (voice) =>
          voice.lang.toLowerCase().split('-')[0] ===
          normalizedLanguage.split('-')[0],
      )

    if (!voice) {
      reject(new Error(`Нет голоса для языка: ${language}`))
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)

    utterance.voice = voice
    utterance.lang = voice.lang

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
