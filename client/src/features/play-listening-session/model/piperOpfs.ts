import { HF_BASE, PATH_MAP, type VoiceId } from '@diffusionstudio/vits-web'
import type { PiperStage } from './piperProbe'

// Sizes of the unchanged, reviewed models used by the probe. A cancelled write
// must never be accepted as a complete model on the next generation.
const MODEL_BYTES = {
  'en_US-ljspeech-medium': 63531379,
  'en_US-joe-medium': 63201294,
  'en_GB-alba-medium': 63201294,
  'en_GB-northern_english_male-medium': 63201294,
  'de_DE-thorsten-medium': 63201294,
  'ru_RU-denis-medium': 63201294,
  'ru_RU-dmitri-medium': 63201294,
} as const

interface SyncAccess {
  write(data: Uint8Array, options: { at: number }): number
  truncate(size: number): void | Promise<void>
  flush(): void | Promise<void>
  close(): void | Promise<void>
}
type WorkerFile = FileSystemFileHandle & { createSyncAccessHandle(): Promise<SyncAccess> }
type Status = (message: string, stage: PiperStage) => void

// Safari before 26 has sync OPFS access in Workers, but no createWritable().
// Stream to disk instead of allocating a second complete model ArrayBuffer.
export async function writePiperFile(file: WorkerFile, response: Response, expectedBytes?: number) {
  if (!response.ok) throw new Error(`Piper download: HTTP ${response.status}`)
  const access = await file.createSyncAccessHandle()
  const reader = response.body?.getReader()
  let received = 0
  try {
    if (!reader) throw new Error('Piper download: response body is missing')
    await access.truncate(0)
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      let offset = 0
      while (offset < value.length) {
        const written = access.write(value.subarray(offset), { at: received })
        if (written <= 0) throw new Error('OPFS: write returned zero bytes')
        received += written
        offset += written
      }
    }
    if (!received || (expectedBytes !== undefined && received !== expectedBytes)) {
      throw new Error(`Piper download incomplete: ${received}/${expectedBytes ?? '?'} bytes`)
    }
    await access.flush()
  } finally {
    try { await reader?.cancel() } finally { await access.close() }
  }
}

export async function preparePiperOpfs(voiceId: VoiceId, status: Status) {
  if (!Object.hasOwn(MODEL_BYTES, voiceId)) throw new Error('Выберите проверенную модель Piper.')
  const expectedBytes = MODEL_BYTES[voiceId as keyof typeof MODEL_BYTES]
  status('Проверка кэша выбранной модели…', 'cache')
  let dir: FileSystemDirectoryHandle
  try {
    dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('piper', { create: true })
  } catch {
    status('OPFS недоступен. Библиотека продолжит без сохранения модели.', 'cache')
    return
  }
  const modelPath = PATH_MAP[voiceId]
  const needsSync = typeof FileSystemFileHandle.prototype.createWritable !== 'function'
  for (const suffix of ['.json', '']) {
    const url = `${HF_BASE}/${modelPath}${suffix}`
    const name = url.split('/').at(-1)!
    let file: File | undefined
    try { file = await (await dir.getFileHandle(name)).getFile() }
    catch (error) { if (!(error instanceof DOMException) || error.name !== 'NotFoundError') throw error }
    let valid = false
    if (file?.size) {
      if (suffix) {
        try {
          const config = JSON.parse(await file.text())
          valid = !!config.audio?.sample_rate && !!config.phoneme_id_map && !!config.espeak?.voice
        } catch { /* An empty, HTML or interrupted JSON response is not a config. */ }
      } else valid = file.size === expectedBytes
    }
    if (valid) continue
    if (file) {
      await dir.removeEntry(name)
      status(`Удалён повреждённый кэш ${name} (${file.size} байт).`, 'cache')
    }
    if (!needsSync) continue // Modern browsers keep using the upstream writer.
    const handle = await dir.getFileHandle(name, { create: true }) as WorkerFile
    try {
      if (typeof handle.createSyncAccessHandle !== 'function') {
        await dir.removeEntry(name)
        status('Запись OPFS не поддерживается; при следующем запуске модель скачается заново.', 'cache')
        continue
      }
      status(`Совместимая запись кэша Safari: ${name}. Загрузка…`, suffix ? 'config' : 'model')
      await writePiperFile(handle, await fetch(url), suffix ? undefined : expectedBytes)
      if (suffix) JSON.parse(await (await handle.getFile()).text())
    } catch (error) {
      // A failed write must not poison subsequent calls. Never touch other data.
      try { await dir.removeEntry(name) } catch { /* Preserve the original error. */ }
      throw error
    }
  }
}
