export const PIPER_VOICES = {
  en: { name: 'English', voiceId: 'en_US-ljspeech-medium', word: 'hello' },
  de: { name: 'Deutsch', voiceId: 'de_DE-thorsten-medium', word: 'Hallo' },
  ru: { name: 'Русский', voiceId: 'ru_RU-denis-medium', word: 'привет' },
  uk: { name: 'Українська', voiceId: 'uk_UA-ukrainian_tts-medium', word: 'привіт' },
} as const

export type PiperLanguage = keyof typeof PIPER_VOICES
export type PiperRequest = { language: PiperLanguage; text: string }
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

export function piperError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (/^Модель Piper|^Введите|^Выберите|^Ожидалась/u.test(message)) return message
  if (/memory|allocation|out of bounds|oom/i.test(message)) return 'Не хватает памяти для Piper. Закройте другие вкладки и повторите. Safari также может перезагрузить вкладку без сообщения.'
  if (/wasm|webassembly|simd|backend|compile|unsupported/i.test(message)) return 'Браузер не смог запустить Piper/WASM. Обновите браузер; модель может не поддерживаться на этом устройстве.'
  return 'Не удалось создать озвучку Piper. Проверьте сеть: нужны модель и WASM. Возможны также нехватка памяти или несовместимость браузера.'
}
