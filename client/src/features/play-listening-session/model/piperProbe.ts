export const PIPER_VOICES = {
  en: { name: 'English', voiceId: 'en_US-ljspeech-medium', word: 'hello' },
  de: { name: 'Deutsch', voiceId: 'de_DE-thorsten-medium', word: 'Hallo' },
  ru: { name: 'Русский', voiceId: 'ru_RU-denis-medium', word: 'привет' },
  uk: { name: 'Українська', voiceId: 'uk_UA-ukrainian_tts-medium', word: 'привіт' },
} as const

export type PiperLanguage = keyof typeof PIPER_VOICES
export type PiperRequest = { language: PiperLanguage; text: string }
export type PiperStage = 'validate' | 'cache' | 'config' | 'model' | 'synthesis' | 'worker' | 'timeout'
export interface PiperErrorContext { language?: PiperLanguage; stage: PiperStage }
export type PiperReply =
  | { type: 'status'; message: string }
  | { type: 'done'; audio: Blob }
  | { type: 'error'; message: string }

export function validatePiperRequest(value: PiperRequest) {
  if (!value || !Object.hasOwn(PIPER_VOICES, value.language)) throw new Error('Выберите поддерживаемый язык Piper.')
  const text = typeof value.text === 'string' ? value.text.trim() : ''
  if (!text || text.length > 60) throw new Error('Введите короткое слово или фразу (до 60 символов).')
  return { text, voiceId: PIPER_VOICES[value.language].voiceId }
}

export function piperError(error: unknown, context?: PiperErrorContext) {
  const value = error as { name?: unknown; message?: unknown } | null
  const message = typeof value?.message === 'string' ? value.message : String(error)
  const name = typeof value?.name === 'string' ? value.name : 'Error'
  const where = context ? `Этап: ${context.stage}; язык: ${context.language ?? '?'}; модель: ${context.language ? PIPER_VOICES[context.language].voiceId : '?'}. ` : ''
  let explanation = 'Не удалось создать озвучку Piper.'
  if (/^Модель Piper|^Введите|^Выберите|^Ожидалась/u.test(message)) explanation = message
  else if (/memory|allocation|oom/i.test(message)) explanation = 'Ошибка памяти Piper. Закройте другие вкладки и повторите.'
  else if (/wasm|webassembly|simd|backend|compile|unsupported/i.test(message)) explanation = 'Браузер не смог запустить Piper/WASM.'
  else if (/JSON/i.test(message) || name === 'SyntaxError') explanation = 'Piper получил пустой или повреждённый конфиг модели.'
  return `${explanation} ${where}Причина: ${name}: ${message.slice(0, 1200)}`
}
