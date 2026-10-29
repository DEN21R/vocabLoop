const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { test } = require('node:test')
const ts = require('typescript')

function load(globals = {}) {
  const source = readFileSync(resolve(__dirname, '../src/shared/lib/tts/piperOpfs.ts'), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', ...Object.keys(globals), code)(
    () => ({ HF_BASE: 'https://huggingface.co/test', PATH_MAP: { 'en_US-ljspeech-medium': 'en_US-ljspeech-medium.onnx' } }),
    module, module.exports, ...Object.values(globals),
  )
  return module.exports
}

test('streamed sync OPFS writes handle partial writes and always close the file', async () => {
  const { writePiperFile } = load()
  const writes = []
  let closed = 0
  let flushed = 0
  const access = {
    truncate(size) { assert.equal(size, 0) },
    write(bytes, { at }) { writes.push([at, bytes[0]]); return 1 },
    flush() { flushed++ }, close() { closed++ },
  }
  await writePiperFile({ createSyncAccessHandle: async () => access }, new Response(Uint8Array.of(3, 4, 5)), 3)
  assert.deepEqual(writes, [[0, 3], [1, 4], [2, 5]])
  assert.equal(flushed, 1)
  assert.equal(closed, 1)
  await assert.rejects(writePiperFile({ createSyncAccessHandle: async () => access }, new Response(Uint8Array.of(1)), 3), /incomplete/)
  assert.equal(closed, 2)
})

test('HTTP failures preserve their status without creating an access handle', async () => {
  const { writePiperFile } = load()
  await assert.rejects(writePiperFile({ createSyncAccessHandle() { throw Error('must not open') } }, new Response('Unavailable', { status: 503 })), /HTTP 503/)
})

test('async truncate/flush/close finish before the caller can terminate its Worker', async () => {
  const { writePiperFile } = load()
  const events = []
  const later = async (event) => { await Promise.resolve(); events.push(event) }
  await writePiperFile({ createSyncAccessHandle: async () => ({
    truncate: () => later('truncate'),
    write(bytes) { assert.deepEqual(events, ['truncate']); return bytes.length },
    flush: () => later('flush'), close: () => later('close'),
  }) }, new Response(Uint8Array.of(1)), 1)
  assert.deepEqual(events, ['truncate', 'flush', 'close'])
})

test('an interrupted response still closes the sync file and preserves the network error', async () => {
  const { writePiperFile } = load()
  let closed = false
  const response = new Response(new ReadableStream({ start(controller) { controller.error(new Error('connection reset')) } }))
  await assert.rejects(writePiperFile({ createSyncAccessHandle: async () => ({
    truncate() {}, write() { throw Error('must not write') }, flush() {}, close() { closed = true },
  }) }, response), /connection reset/)
  assert(closed)
})

function oldSafari({ httpFails = false, modern = false } = {}) {
  const configName = 'en_US-ljspeech-medium.onnx.json'
  const modelName = 'en_US-ljspeech-medium.onnx'
  const files = new Map([[configName, new Blob()], [modelName, { size: 63531379 }], ['unrelated', new Blob(['keep'])]])
  let downloads = 0
  let closed = 0
  const dir = {
    async getFileHandle(name, options) {
      if (!files.has(name)) {
        if (!options?.create) throw new DOMException('Missing', 'NotFoundError')
        files.set(name, new Blob())
      }
      return {
        async getFile() { return files.get(name) },
        async createSyncAccessHandle() {
          const chunks = []
          return {
            truncate() {}, write(bytes) { chunks.push(bytes.slice()); return bytes.length },
            flush() { files.set(name, new Blob(chunks)) }, close() { closed++ },
          }
        },
      }
    },
    async removeEntry(name) { files.delete(name) },
  }
  class FileSystemFileHandle {}
  if (modern) FileSystemFileHandle.prototype.createWritable = () => {}
  const api = load({
    navigator: { storage: { getDirectory: async () => ({ getDirectoryHandle: async () => dir }) } },
    FileSystemFileHandle,
    fetch: async () => {
      downloads++
      return httpFails ? new Response('Unavailable', { status: 503 }) : Response.json({ audio: { sample_rate: 22050 }, phoneme_id_map: { _: [0] }, espeak: { voice: 'en-us' } })
    },
  })
  return { ...api, files, configName, stats: () => ({ downloads, closed }) }
}

test('old Safari repairs the empty config left by createWritable failure and reuses it next time', async () => {
  const env = oldSafari()
  const messages = []
  await env.preparePiperOpfs('en_US-ljspeech-medium', (message) => messages.push(message))
  assert.equal(JSON.parse(await env.files.get(env.configName).text()).espeak.voice, 'en-us')
  await env.preparePiperOpfs('en_US-ljspeech-medium', () => {})
  assert.deepEqual(env.stats(), { downloads: 1, closed: 1 })
  assert(messages.some((message) => message.includes('повреждённый кэш')))
  assert.equal(await env.files.get('unrelated').text(), 'keep')
})

test('failed compatible cache write removes the poisoned entry and a modern browser leaves download to upstream', async () => {
  const failing = oldSafari({ httpFails: true })
  await assert.rejects(failing.preparePiperOpfs('en_US-ljspeech-medium', () => {}), /HTTP 503/)
  assert(!failing.files.has(failing.configName))
  const modern = oldSafari({ modern: true })
  await modern.preparePiperOpfs('en_US-ljspeech-medium', () => {})
  assert(!modern.files.has(modern.configName))
  assert.equal(modern.stats().downloads, 0)
})
