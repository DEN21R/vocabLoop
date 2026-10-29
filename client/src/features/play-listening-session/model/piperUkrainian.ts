import { pcmWav, textPhonemeIds, type TextVoiceConfig } from './piperText'

// Pin config and unchanged weights to the same upstream revision.
const BASE = 'https://huggingface.co/diffusionstudio/piper-voices/resolve/840e38a7e26d813bd6221b78cfbaefa3585b3f71/uk/uk_UA/ukrainian_tts/medium/uk_UA-ukrainian_tts-medium.onnx'
const CACHE = 'vocabloop-piper-probe-v1'

async function modelFile(url: string, status: (text: string) => void) {
  let cache: Cache | undefined
  try {
    cache = await caches.open(CACHE)
    const cached = await cache.match(url)
    if (cached) { status('Украинская модель: чтение из кэша…'); return cached }
  } catch { /* Private mode or storage disabled: synthesis still works. */ }
  status('Загрузка украинской модели и конфига (около 77 МБ). Затем генерация…')
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Piper download: HTTP ${response.status}`)
  if (cache) {
    try { await cache.put(url, response.clone()) }
    catch { status('Кэш недоступен. Продолжаем генерацию без сохранения модели…') }
  }
  return response
}

interface UkrainianConfig extends TextVoiceConfig {
  audio: { sample_rate: number }
  inference: { noise_scale: number; length_scale: number; noise_w: number }
  speaker_id_map: Record<string, number>
}

export async function predictUkrainian(text: string, status: (text: string) => void) {
  const config: UkrainianConfig = await (await modelFile(`${BASE}.json`, status)).json()
  const ids = textPhonemeIds(text, config)
  const model = await (await modelFile(BASE, status)).arrayBuffer()
  const ort = await import('onnxruntime-web')
  // Single-thread WASM needs no SharedArrayBuffer or new Vercel headers.
  ort.env.wasm.numThreads = 1
  ort.env.wasm.wasmPaths = 'https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.18.0/'
  status('Украинская модель: синтез речи…')
  const session = await ort.InferenceSession.create(model, { executionProviders: ['wasm'] })
  try {
    const feeds: Record<string, InstanceType<typeof ort.Tensor>> = {
      input: new ort.Tensor('int64', BigInt64Array.from(ids, BigInt), [1, ids.length]),
      input_lengths: new ort.Tensor('int64', BigInt64Array.of(BigInt(ids.length)), [1]),
      scales: new ort.Tensor('float32', [config.inference.noise_scale, config.inference.length_scale, config.inference.noise_w]),
      sid: new ort.Tensor('int64', BigInt64Array.of(BigInt(config.speaker_id_map.lada)), [1]),
    }
    const { output } = await session.run(feeds)
    return pcmWav(output.data as Float32Array, config.audio.sample_rate)
  } finally {
    await session.release()
  }
}
