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
