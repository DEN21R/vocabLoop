const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { test } = require('node:test')
const ts = require('typescript')

function load(file, imports = {}, globals = {}) {
  const source = readFileSync(resolve(__dirname, '../src/features/play-listening-session/model', file), 'utf8').replaceAll('import.meta.url', "'https://test.local/piperAudio.js'")
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', ...Object.keys(globals), code)((name) => imports[name], module, module.exports, ...Object.values(globals))
  return module.exports
}
const piper = load('piper.ts')
const text = load('piperText.ts')
const words = [
  { _id: '1', original: 'one', translation: 'один', sourceLanguage: 'en-US', targetLanguage: 'ru', hasRecording: true },
  { _id: '2', original: 'two', translation: 'два', sourceLanguage: 'en', targetLanguage: 'ru' },
]
const voices = piper.loadPiperSelections({ getItem: () => null })

test('track preserves order, recording priority, pauses and one native loop timeline', async () => {
  const requests = []
  const recordings = []
  const { buildSessionTrack, sessionPosition } = load('sessionTrack.ts', {
    './piper': piper, './piperText': text,
    './piperAudio': { getPiperAudio: async (request) => { requests.push(request); return new Blob(['clip']) } },
    '../../../entities/word': { getRecording: async (id) => { recordings.push(id); return new Blob(['recording']) } },
  }, { OfflineAudioContext: class {
    async decodeAudioData() { return { length: 22050, numberOfChannels: 2, getChannelData: () => new Float32Array(22050).fill(0.25) } }
  } })
  const track = await buildSessionTrack(words, 2, voices, new AbortController().signal, () => {})
  assert.deepEqual(requests.map((r) => [r.language, r.text, r.voice]), [['en', 'one', voices.en], ['en', 'two', voices.en], ['ru', 'два', voices.ru]])
  assert.deepEqual(recordings, ['1'])
  assert.deepEqual(track.cues.map((c) => [c.time, c.index, c.phase]), [[0, 0, 'original'], [1, 0, 'translation'], [2, 0, 'waiting'], [4, 1, 'original'], [5, 1, 'translation'], [6, 1, 'waiting']])
  assert.equal(sessionPosition(track.cues, 5.5).phase, 'translation')
  assert.equal(sessionPosition(track.cues, 0).index, 0)
  const buffer = await track.audio.arrayBuffer()
  const view = new DataView(buffer)
  assert.equal(view.getUint32(24, true), 22050)
  assert.equal(view.getUint32(40, true), 8 * 22050 * 2)
  assert(view.getInt16(44, true) > 0)
  assert.equal(view.getInt16(44 + 2 * 22050 * 2, true), 0)
  assert.equal(buffer.byteLength, 44 + 8 * 22050 * 2)
})

test('Piper audio cache separates text and voice; warm reads do not start a Worker', async () => {
  const entries = new Map()
  const requests = []
  let terminated = 0
  const audio = text.pcmWav(Float32Array.of(0, 0.5), 22050)
  const cache = {
    match: async (key) => entries.get(key)?.clone(),
    put: async (key, response) => { entries.set(key, response.clone()) },
    delete: async (key) => entries.delete(key),
  }
  class Worker {
    postMessage(request) { requests.push(request); queueMicrotask(() => this.onmessage({ data: { type: 'done', audio } })) }
    terminate() { terminated++ }
  }
  const { getPiperAudio } = load('piperAudio.ts', { './piper': piper }, { Worker, caches: { open: async () => cache }, location: { origin: 'https://test.local' } })
  const signal = new AbortController().signal
  const request = { language: 'en', voice: voices.en, text: 'one' }
  for (let i = 0; i < 2; i++) assert.equal((await getPiperAudio(request, signal, () => {})).size, audio.size)
  assert.equal(requests.length, 1)
  await getPiperAudio({ ...request, voice: 'en_US-joe-medium' }, signal, () => {})
  await getPiperAudio({ ...request, text: 'two' }, signal, () => {})
  assert.equal(entries.size, 3)
  assert.equal(requests.length, 3)
  const key = entries.keys().next().value
  entries.set(key, new Response(new Blob()))
  await getPiperAudio(request, signal, () => {})
  assert.equal(requests.length, 4)
  assert.equal(terminated, 4)
})

test('cancelling synthesis terminates its Worker without saving an unfinished clip', async () => {
  let started, terminated = false
  const running = new Promise((resolve) => { started = resolve })
  class Worker {
    postMessage() { started() }
    terminate() { terminated = true }
  }
  const { getPiperAudio } = load('piperAudio.ts', { './piper': piper }, {
    Worker, location: { origin: 'https://test.local' },
    caches: { open: async () => ({ match: async () => undefined, put: () => assert.fail('Cancelled audio must not be saved') }) },
  })
  const controller = new AbortController()
  const result = getPiperAudio({ language: 'en', voice: voices.en, text: 'one' }, controller.signal, () => {})
  const rejected = assert.rejects(result, { name: 'AbortError' })
  await running
  controller.abort()
  await rejected
  assert.equal(terminated, true)
})

function playerEnvironment(build) {
  const states = []
  const cleanups = []
  const events = new Map()
  const revoked = []
  let src = ''
  const audio = {
    currentTime: 0, loop: false, calls: 0,
    get src() { return src }, set src(value) { src = value },
    addEventListener: (type, fn) => events.set(type, fn), removeEventListener: (type) => events.delete(type),
    play() { this.calls++; events.get('play')?.(); return Promise.resolve() },
    pause() { events.get('pause')?.() }, load() {}, removeAttribute() { src = '' },
  }
  let ref = 0
  const { useSessionPlayer: createPlayer } = load('useSessionPlayer.ts', {
    react: {
      useRef: (value) => ({ current: ++ref === 1 ? audio : value }),
      useState: (value) => [value, (next) => states.push(next)],
      useEffect: (fn) => cleanups.push(fn()),
    },
    './sessionTrack': { buildSessionTrack: build, sessionPosition: (cues, time) => cues.findLast((cue) => cue.time <= time) },
  }, { URL: { createObjectURL: () => 'blob:track', revokeObjectURL: (url) => revoked.push(url) } })
  const player = createPlayer(words, 2, voices)
  return { player, audio, states, revoked, dispose: () => cleanups.forEach((fn) => fn()) }
}
const track = { audio: new Blob(['wav']), cues: [{ time: 0, index: 0, phase: 'original' }] }

test('prepared track uses HTML audio.loop; pause resumes exactly and stop rewinds', async () => {
  let builds = 0
  const env = playerEnvironment(async () => { builds++; return track })
  await env.player.prepare()
  assert.equal(env.audio.calls, 0, 'preparation must not autoplay outside a gesture')
  const playing = env.player.play()
  assert.equal(env.audio.calls, 1, 'play is invoked synchronously from the click')
  await playing
  assert.equal(env.audio.loop, true)
  env.audio.currentTime = 1.5
  env.player.pause()
  assert.equal(env.audio.currentTime, 1.5)
  await env.player.play()
  assert.equal(env.audio.currentTime, 1.5)
  env.player.stop()
  assert.equal(env.audio.currentTime, 0)
  await env.player.play()
  assert.equal(builds, 1)
  env.dispose()
  assert.deepEqual(env.revoked, ['blob:track'])
  assert.equal(env.audio.src, '')
})

test('stopping or unmounting during preparation aborts and ignores late results', async () => {
  let complete, signal
  const env = playerEnvironment((words, interval, voices, abortSignal) => { signal = abortSignal; return new Promise((resolve) => { complete = resolve }) })
  const pending = env.player.prepare()
  env.player.stop()
  assert.equal(signal.aborted, true)
  complete(track)
  await pending
  assert.equal(env.audio.src, '')
  const next = env.player.prepare()
  env.dispose()
  assert.equal(signal.aborted, true)
  complete(track)
  await next
  assert.equal(env.audio.src, '')
})

// Shared playback is still used by individual dictionary words.
test('late play rejection after stop cannot clear the next recording', async () => {
  const urls = new Set()
  let nextUrl = 0, rejectFirst
  const { playAudio } = load('../../../shared/lib/audio/playAudio.ts', {}, {
    URL: {
      createObjectURL() { const url = `blob:${++nextUrl}`; urls.add(url); return url },
      revokeObjectURL: (url) => urls.delete(url),
    },
  })
  const element = { pause() {}, removeAttribute() {}, load() {}, play: () => new Promise((_, reject) => { rejectFirst = reject }) }
  const first = playAudio(new Blob(['first']), element)
  first.stop()
  element.play = () => Promise.resolve()
  const second = playAudio(new Blob(['second']), element)
  rejectFirst(new DOMException('Interrupted', 'AbortError'))
  await first.finished
  assert.equal(urls.size, 1)
  second.stop()
  await second.finished
  assert.equal(urls.size, 0)
})
