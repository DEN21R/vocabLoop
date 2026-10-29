import type { VoiceId } from '@diffusionstudio/vits-web'

export interface PiperVoice { id: string; modelId: VoiceId; label: string; speaker?: string }
const voice = (modelId: VoiceId, label: string, speaker?: string): PiperVoice => ({
  id: speaker ? `${modelId}:${speaker}` : modelId, modelId, label, speaker,
})

export const PIPER_VOICES = {
  en: { name: 'English', word: 'hello', voices: [
    voice('en_US-ljspeech-medium', 'LJ Speech — женский, США'),
    voice('en_US-joe-medium', 'Joe — мужской, США'),
    voice('en_GB-alba-medium', 'Alba — женский, Шотландия'),
    voice('en_GB-northern_english_male-medium', 'Northern English — мужской, север Англии'),
  ] },
  de: { name: 'Deutsch', word: 'Hallo', voices: [
    voice('de_DE-thorsten-medium', 'Thorsten — мужской, Германия'),
  ] },
  ru: { name: 'Русский', word: 'привет', voices: [
    voice('ru_RU-denis-medium', 'Денис — мужской'),
    voice('ru_RU-dmitri-medium', 'Дмитрий — мужской'),
  ] },
  uk: { name: 'Українська', word: 'привіт', voices: [
    voice('uk_UA-ukrainian_tts-medium', 'Лада — жіночий', 'lada'),
    voice('uk_UA-ukrainian_tts-medium', 'Микита — чоловічий', 'mykyta'),
    voice('uk_UA-ukrainian_tts-medium', 'Тетяна — жіночий', 'tetiana'),
  ] },
} as const

export type PiperLanguage = keyof typeof PIPER_VOICES
export type PiperRequest = { language: PiperLanguage; text: string; voice?: string }
export type PiperStage = 'validate' | 'cache' | 'config' | 'model' | 'synthesis' | 'worker' | 'timeout'
export interface PiperErrorContext { language?: PiperLanguage; stage: PiperStage; voice?: string }
export type PiperReply =
  | { type: 'status'; message: string }
  | { type: 'done'; audio: Blob }
  | { type: 'error'; message: string }

export function validatePiperRequest(value: PiperRequest) {
  if (!value || !Object.hasOwn(PIPER_VOICES, value.language)) throw new Error('Выберите поддерживаемый язык Piper.')
  const text = typeof value.text === 'string' ? value.text.trim() : ''
  if (!text || text.length > 60) throw new Error('Введите короткое слово или фразу (до 60 символов).')
  const selected = getPiperVoice(value.language, value.voice)
  if (!selected) throw new Error('Выберите проверенный голос выбранного языка Piper.')
  return { text, voiceId: selected.modelId, speaker: selected.speaker, choiceId: selected.id }
}

export function getPiperVoice(language: PiperLanguage, id?: string) {
  const voices = PIPER_VOICES[language].voices
  return id === undefined ? voices[0] : voices.find((item) => item.id === id)
}

export type PiperSelections = Record<PiperLanguage, string>
export const PIPER_SELECTION_KEY = 'vocabloop.piper.voices.v1'
export function loadPiperSelections(storage?: Pick<Storage, 'getItem'>): PiperSelections {
  const defaults = Object.fromEntries(Object.entries(PIPER_VOICES).map(([key, value]) => [key, value.voices[0].id])) as PiperSelections
  try {
    const saved = JSON.parse((storage ?? globalThis.localStorage).getItem(PIPER_SELECTION_KEY) ?? '{}')
    for (const language of Object.keys(defaults) as PiperLanguage[]) {
      if (typeof saved?.[language] === 'string' && getPiperVoice(language, saved[language])) defaults[language] = saved[language]
    }
  } catch { /* Storage blocked or old/invalid choices: keep safe defaults. */ }
  return defaults
}
export function savePiperSelections(value: PiperSelections, storage?: Pick<Storage, 'setItem'>) {
  try { (storage ?? globalThis.localStorage).setItem(PIPER_SELECTION_KEY, JSON.stringify(value)) }
  catch { /* A disabled/quota-limited localStorage must not disable synthesis. */ }
}

export function piperError(error: unknown, context?: PiperErrorContext) {
  const value = error as { name?: unknown; message?: unknown } | null
  const message = typeof value?.message === 'string' ? value.message : String(error)
  const name = typeof value?.name === 'string' ? value.name : 'Error'
  const selected = context?.language ? getPiperVoice(context.language, context.voice) : undefined
  const where = context ? `Этап: ${context.stage}; язык: ${context.language ?? '?'}; модель: ${selected?.modelId ?? '?'}${selected?.speaker ? `; диктор: ${selected.speaker}` : ''}. ` : ''
  let explanation = 'Не удалось создать озвучку Piper.'
  if (/^Модель Piper|^Введите|^Выберите|^Ожидалась/u.test(message)) explanation = message
  else if (/memory|allocation|oom/i.test(message)) explanation = 'Ошибка памяти Piper. Закройте другие вкладки и повторите.'
  else if (/wasm|webassembly|simd|backend|compile|unsupported/i.test(message)) explanation = 'Браузер не смог запустить Piper/WASM.'
  else if (/JSON/i.test(message) || name === 'SyntaxError') explanation = 'Piper получил пустой или повреждённый конфиг модели.'
  return `${explanation} ${where}Причина: ${name}: ${message.slice(0, 1200)}`
}
