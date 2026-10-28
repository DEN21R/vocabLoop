export function playAudio(blob: Blob, audio = new Audio()) {
  const url = URL.createObjectURL(blob)
  let stop = () => {}

  const finished = new Promise<void>((resolve, reject) => {
    let done = false

    function finish(error?: Error) {
      if (done) return
      done = true

      audio.onended = null
      audio.onerror = null
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      URL.revokeObjectURL(url)

      if (error) reject(error)
      else resolve()
    }

    stop = () => finish()
    audio.onended = () => finish()
    audio.onerror = () => finish(new Error('Не удалось воспроизвести запись'))
    audio.src = url
    try {
      audio.play().catch((error: unknown) => {
        finish(playbackError(error))
      })
    } catch (error) {
      finish(playbackError(error))
    }
  })

  return { finished, stop }
}

function playbackError(error: unknown): Error {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  return new Error(`Не удалось запустить запись (${detail})`, { cause: error })
}

// Play a short, silent PCM WAV from the click handler to authorize this element
// on iOS. Keep using the same element for the actual recordings afterwards.
export function unlockAudio(audio: HTMLAudioElement) {
  const wav = new ArrayBuffer(44 + 160 * 2)
  const view = new DataView(wav)
  function writeText(offset: number, text: string) {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
  }
  writeText(0, 'RIFF')
  view.setUint32(4, wav.byteLength - 8, true)
  writeText(8, 'WAVEfmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, 8000, true)
  view.setUint32(28, 16000, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeText(36, 'data')
  view.setUint32(40, wav.byteLength - 44, true)
  return playAudio(new Blob([wav], { type: 'audio/wav' }), audio)
}
