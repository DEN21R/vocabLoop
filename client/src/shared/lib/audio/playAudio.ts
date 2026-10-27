export function playAudio(blob: Blob) {
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
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
    audio.play().catch(() => {
      finish(new Error('Не удалось запустить запись'))
    })
  })

  return { finished, stop }
}
