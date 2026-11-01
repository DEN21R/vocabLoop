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

export async function getPiperAudio(request: PiperRequest, signal: AbortSignal, status: (message: string) => void, onDiagnostic?: (line: string) => void): Promise<Blob> {
  const validated = validatePiperRequest(request)
  signal.throwIfAborted()
  const lookupStarted = performance.now()
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([
    'v1', request.language, validated.choiceId, validated.text,
  ])))
  const key = new URL(`/__piper_audio__/${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}.wav`, location.origin).href
  // Temporary diagnostics: compare the same key before and after an app restart.
  const diagnostic = {
    run: performance.timeOrigin,
    origin: location.origin,
    mode: globalThis.matchMedia?.('(display-mode: standalone)').matches ? 'standalone' : 'browser',
    language: request.language, voice: validated.choiceId, text: validated.text, key,
  }
  function report(event: string, details: Record<string, unknown> = {}) {
    const data = { ...diagnostic, ...details }
    if (event.includes('ERROR')) console.warn(`[Piper cache] ${event}`, data)
    else console.info(`[Piper cache] ${event}`, data)
    onDiagnostic?.(`${event} ${JSON.stringify(data)}`)
  }
  report('LOOKUP_START')
  let cache: Cache
  try { cache = await caches.open('vocabloop-piper-audio-v1') }
  catch (cause) {
    report('ERROR', { stage: 'open', ms: Math.round(performance.now() - lookupStarted), error: String(cause) })
    throw new Error('Браузер не разрешил сохранять озвучку. Разрешите хранение данных сайта и повторите подготовку.')
  }
  signal.throwIfAborted()
  let cached: Response | undefined
  try { cached = await cache.match(key) }
  catch (cause) {
    report('ERROR', { stage: 'match', ms: Math.round(performance.now() - lookupStarted), error: String(cause) })
    throw cause
  }
  const lookupMs = Math.round(performance.now() - lookupStarted)
  if (cached) {
    const readStarted = performance.now()
    try {
      const audio = await cached.blob()
      const header = new DataView(await audio.slice(0, 44).arrayBuffer())
      const valid = audio.size > 44 && header.getUint32(0) === 0x52494646 && header.getUint32(8) === 0x57415645 && header.getUint32(40, true) === audio.size - 44
      report(valid ? 'HIT' : 'MISS', {
        reason: valid ? 'valid-wav' : 'invalid-wav-header', lookupMs,
        readMs: Math.round(performance.now() - readStarted), bytes: audio.size,
      })
      if (valid) return audio
      await cache.delete(key)
    } catch (cause) {
      report('ERROR', { stage: 'read-or-delete', lookupMs, ms: Math.round(performance.now() - readStarted), error: String(cause) })
      throw cause
    }
  } else report('MISS', { reason: 'key-not-found', lookupMs })
  const generationStarted = performance.now()
  report('GENERATE_START')
  let audio: Blob
  try { audio = await synthesize({ ...request, text: validated.text }, signal, status) }
  catch (cause) {
    report('GENERATE_ERROR', { generationMs: Math.round(performance.now() - generationStarted), error: String(cause) })
    throw cause
  }
  report('GENERATED', { generationMs: Math.round(performance.now() - generationStarted), bytes: audio.size })
  signal.throwIfAborted()
  const saveStarted = performance.now()
  try {
    await cache.put(key, new Response(audio, { headers: { 'Content-Type': 'audio/wav' } }))
    report('SAVED', { saveMs: Math.round(performance.now() - saveStarted), bytes: audio.size })
  } catch (cause) {
    report('ERROR', { stage: 'save', ms: Math.round(performance.now() - saveStarted), error: String(cause) })
    throw new Error('Не удалось сохранить озвучку: недостаточно места в хранилище браузера. Освободите место и повторите подготовку.')
  }
  return audio
}
