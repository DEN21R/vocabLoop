import { predict } from '@diffusionstudio/vits-web'
import { predictUkrainian } from './piperUkrainian'
import { preparePiperOpfs } from './piperOpfs'
import { piperError, validatePiperRequest, type PiperRequest, type PiperReply, type PiperStage } from './piper'

const reply = (message: PiperReply) => self.postMessage(message)
let stage: PiperStage = 'validate'
let language: PiperRequest['language'] | undefined
let voice: string | undefined
const status = (message: string, nextStage?: PiperStage) => {
  if (nextStage) stage = nextStage
  reply({ type: 'status', message })
}
const failure = (error: unknown) => {
  console.error('[Piper]', error)
  reply({ type: 'error', message: piperError(error, { stage, language, voice }) })
}

// Keep isolation: upstream predict() neither reuses nor releases its ONNX session.
// Retaining this worker alone would accumulate sessions, not reuse a model.
self.onmessage = async ({ data }: MessageEvent<PiperRequest>) => {
  try {
    const request = validatePiperRequest(data)
    language = data.language
    voice = request.choiceId
    if (data.language !== 'uk') await preparePiperOpfs(request.voiceId, status)
    stage = 'synthesis'
    let lastMb = -1
    const audio = data.language === 'uk'
      ? await predictUkrainian(request.text, status, request.speaker)
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
