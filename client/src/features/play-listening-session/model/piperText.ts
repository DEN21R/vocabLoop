export interface TextVoiceConfig {
  phoneme_type: string
  num_symbols: number
  phoneme_id_map: Record<string, number[]>
  phoneme_map?: Record<string, string[]>
}

// Piper's text phonemizer uses case folding, NFD codepoints, the model's own
// ID table, BOS + pad, a pad after each phoneme, and EOS. No eSpeak IDs here.
// Source: wide-video/piper-phonemize/src/{phonemize,phoneme_ids}.cpp.
export function textPhonemeIds(text: string, config: TextVoiceConfig): number[] {
  if (config.phoneme_type !== 'text') throw new Error('Ожидалась текстовая модель Piper.')
  const map = config.phoneme_id_map
  function ids(phoneme: string) {
    const values = Object.hasOwn(map, phoneme) ? map[phoneme] : undefined
    if (!values?.length || values.some((id) => !Number.isInteger(id) || id < 0 || id >= config.num_symbols)) {
      throw new Error(`Модель Piper не поддерживает символ «${phoneme}». Для украинской проверки вводите слова без цифр и латиницы.`)
    }
    return values
  }
  const pad = ids('_')
  const result = [...ids('^'), ...pad]
  // Ukrainian apostrophes have several common Unicode spellings.
  const normalized = text.trim().replace(/[’‘ʼ]/gu, "'").toLowerCase().normalize('NFD')
  for (const codepoint of normalized) {
    const phonemes = config.phoneme_map?.[codepoint] ?? [codepoint]
    for (const phoneme of phonemes) result.push(...ids(phoneme), ...pad)
  }
  result.push(...ids('$'))
  return result
}

export function pcmWav(pcm: Float32Array, sampleRate: number): Blob {
  if (!pcm.length || !Number.isInteger(sampleRate) || sampleRate <= 0) throw new Error('Piper вернул пустое аудио.')
  const bytes = new ArrayBuffer(44 + pcm.length * 2)
  const view = new DataView(bytes)
  const tag = (offset: number, value: string) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)))
  tag(0, 'RIFF'); view.setUint32(4, bytes.byteLength - 8, true); tag(8, 'WAVE')
  tag(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true)
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  tag(36, 'data'); view.setUint32(40, pcm.length * 2, true)
  pcm.forEach((value, index) => {
    if (!Number.isFinite(value)) throw new Error('Piper вернул некорректное аудио.')
    const sample = Math.max(-1, Math.min(1, value))
    view.setInt16(44 + index * 2, sample < 0 ? sample * 32768 : sample * 32767, true)
  })
  return new Blob([bytes], { type: 'audio/wav' })
}
