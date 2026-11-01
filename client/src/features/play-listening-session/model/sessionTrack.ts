import { getRecording, type IWord } from '../../../entities/word'
import { getPiperAudio } from '../../../shared/lib/tts/piperAudio'
import { piperLanguage, type PiperSelections } from '../../../shared/lib/tts/piper'
import { pcmWav, wavHeader } from '../../../shared/lib/tts/piperText'

export interface SessionCue { time: number; index: number; phase: 'original' | 'translation' | 'waiting' }
export interface SessionTrack { audio: Blob; cues: SessionCue[] }
const SAMPLE_RATE = 22050

export async function buildSessionTrack(words: IWord[], intervalSeconds: number, voices: PiperSelections, signal: AbortSignal, status: (message: string) => void): Promise<SessionTrack> {
  if (!words.length) throw new Error('Добавьте слова в сессию.')
  if (!Number.isFinite(intervalSeconds) || intervalSeconds < 0 || intervalSeconds > 60) throw new Error('Интервал должен быть от 0 до 60 секунд.')
  // Decode/resample one short clip at a time; playback never uses Web Audio.
  const decoder = new OfflineAudioContext(1, 1, SAMPLE_RATE)
  const parts: Blob[] = []
  const cues: SessionCue[] = []
  const silenceSamples = Math.round(intervalSeconds * SAMPLE_RATE)
  const silence = new Blob([new Uint8Array(silenceSamples * 2)])
  let samples = 0
  for (const [index, word] of words.entries()) {
    for (const phase of ['original', 'translation'] as const) {
      signal.throwIfAborted()
      const label = `${index + 1}/${words.length}: ${word.original} · ${phase === 'original' ? 'оригинал' : 'перевод'}`
      status(label)
      let audio: Blob
      if (phase === 'translation' && word.hasRecording) audio = await getRecording(word._id)
      else {
        const language = piperLanguage(phase === 'original' ? word.sourceLanguage : word.targetLanguage)
        audio = await getPiperAudio({ language, voice: voices[language], text: phase === 'original' ? word.original : word.translation }, signal, (message) => status(`${label}. ${message}`))
      }
      signal.throwIfAborted()
      let decoded: AudioBuffer
      try { decoded = await decoder.decodeAudioData(await audio.arrayBuffer()) }
      catch { throw new Error(`Не удалось прочитать аудио: ${label}. Проверьте запись и поддержку её формата в браузере.`) }
      signal.throwIfAborted()
      const pcm = new Float32Array(decoded.length)
      for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
        const input = decoded.getChannelData(channel)
        for (let sample = 0; sample < pcm.length; sample++) pcm[sample] += input[sample] / decoded.numberOfChannels
      }
      cues.push({ time: samples / SAMPLE_RATE, index, phase })
      parts.push(pcmWav(pcm, SAMPLE_RATE).slice(44))
      samples += pcm.length
    }
    if (silenceSamples) {
      cues.push({ time: samples / SAMPLE_RATE, index, phase: 'waiting' })
      parts.push(silence)
      samples += silenceSamples
    }
  }
  signal.throwIfAborted()
  return { audio: new Blob([wavHeader(samples, SAMPLE_RATE), ...parts], { type: 'audio/wav' }), cues }
}

export function sessionPosition(cues: SessionCue[], time: number) {
  return cues.findLast((cue) => cue.time <= time) ?? cues[0]
}
