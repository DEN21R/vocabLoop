import { predict } from '@diffusionstudio/vits-web'
import { predictUkrainian } from './piperUkrainian'
import { piperError, validatePiperRequest, type PiperRequest, type PiperReply } from './piperProbe'

const reply = (message: PiperReply) => self.postMessage(message)
const status = (message: string) => reply({ type: 'status', message })
const failure = (error: unknown) => {
  console.error('[Piper probe]', error)
  reply({ type: 'error', message: piperError(error) })
}

// A fresh worker for each generation bounds retained upstream ONNX/eSpeak heaps.
self.onmessage = async ({ data }: MessageEvent<PiperRequest>) => {
  try {
    const request = validatePiperRequest(data)
    let lastMb = -1
    const audio = data.language === 'uk'
      ? await predictUkrainian(request.text, status)
      : await predict(request, ({ loaded }) => {
        const mb = Math.floor(loaded / 1048576)
        if (mb !== lastMb) { lastMb = mb; status(`Модель: загружено ${mb} МБ. Затем синтез речи…`) }
      })
    reply({ type: 'done', audio })
  } catch (error) { failure(error) }
}

// Upstream phonemizer may reject outside predict()'s promise executor.
self.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  event.preventDefault()
  failure(event.reason)
})
