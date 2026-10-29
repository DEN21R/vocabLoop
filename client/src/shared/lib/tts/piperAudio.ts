import { piperError, validatePiperRequest, type PiperReply, type PiperRequest } from './piper'

// A new Worker releases the upstream ONNX/eSpeak heaps after each synthesis.
function synthesize(request: PiperRequest, signal: AbortSignal, status: (message: string) => void): Promise<Blob> {
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./piper.worker.ts', import.meta.url), { type: 'module' })
    const context = { language: request.language, voice: request.voice, stage: 'worker' as const }
    const timer = setTimeout(() => finish(undefined, new Error('Piper не завершил генерацию за 3 минуты. Повторите подготовку.')), 180_000)
    function finish(audio?: Blob, error?: unknown) {
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
      worker.terminate()
      if (error) reject(error)
      else resolve(audio!)
    }
    function abort() { finish(undefined, signal.reason) }
    signal.addEventListener('abort', abort, { once: true })
    worker.onerror = (event) => {
      event.preventDefault()
      finish(undefined, new Error(piperError(event.error ?? new Error(event.message), context)))
    }
    worker.onmessageerror = () => finish(undefined, new Error('Не удалось получить аудио Piper из Worker.'))
    worker.onmessage = ({ data }: MessageEvent<PiperReply>) => {
      if (data.type === 'status') status(data.message)
      else if (data.type === 'error') finish(undefined, new Error(data.message))
      else finish(data.audio)
    }
    try { worker.postMessage(request) }
    catch (error) { finish(undefined, error) }
  })
}

export async function getPiperAudio(request: PiperRequest, signal: AbortSignal, status: (message: string) => void): Promise<Blob> {
  const validated = validatePiperRequest(request)
  signal.throwIfAborted()
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([
    'v1', request.language, validated.choiceId, validated.text,
  ])))
  const key = new URL(`/__piper_audio__/${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}.wav`, location.origin).href
  let cache: Cache
  try { cache = await caches.open('vocabloop-piper-audio-v1') }
  catch { throw new Error('Браузер не разрешил сохранять озвучку. Разрешите хранение данных сайта и повторите подготовку.') }
  signal.throwIfAborted()
  const cached = await cache.match(key)
  if (cached) {
    const audio = await cached.blob()
    const header = new DataView(await audio.slice(0, 44).arrayBuffer())
    if (audio.size > 44 && header.getUint32(0) === 0x52494646 && header.getUint32(8) === 0x57415645 && header.getUint32(40, true) === audio.size - 44) return audio
    await cache.delete(key)
  }
  const audio = await synthesize({ ...request, text: validated.text }, signal, status)
  signal.throwIfAborted()
  try { await cache.put(key, new Response(audio, { headers: { 'Content-Type': 'audio/wav' } })) }
  catch { throw new Error('Не удалось сохранить озвучку: недостаточно места в хранилище браузера. Освободите место и повторите подготовку.') }
  return audio
}
