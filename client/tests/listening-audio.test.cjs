const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { test } = require('node:test')
const ts = require('typescript')

function load(path, imports, globals) {
  const source = readFileSync(resolve(__dirname, '../src', path), 'utf8')
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', ...Object.keys(globals), code)(
    (name) => imports[name], module, module.exports, ...Object.values(globals),
  )
  return module.exports
}

function environment() {
  const elements = []
  const urls = new Map()
  const played = []
  const states = []
  const cleanups = []
  let gesture = true
  let player
  let failure
  let autoEnd = true
  let stopAfter = Infinity
  let nextUrl = 0

  class Audio {
    constructor() {
      elements.push(this)
      this.authorized = false
    }
    play() {
      if (failure) return Promise.reject(failure)
      if (gesture) this.authorized = true
      if (!this.authorized) return Promise.reject(new DOMException('Gesture required', 'NotAllowedError'))
      const blob = urls.get(this.src)
      if (blob.type === 'audio/recording') played.push(blob)
      if (autoEnd) setTimeout(() => {
        this.onended?.()
        if (played.length >= stopAfter) player.stop()
      }, 0)
      return Promise.resolve()
    }
    pause() {}
    removeAttribute() { this.src = '' }
    load() {}
  }

  const audio = load('shared/lib/audio/playAudio.ts', {}, {
    Audio,
    URL: {
      createObjectURL(blob) { const url = `blob:${++nextUrl}`; urls.set(url, blob); return url },
      revokeObjectURL(url) { urls.delete(url) },
    },
  })
  const hook = load('features/play-listening-session/model/useSessionPlayer.ts', {
    react: {
      useRef: (current) => ({ current }),
      useState: (value) => [value, (next) => states.push(next)],
      useEffect: (fn) => { const cleanup = fn(); if (cleanup) cleanups.push(cleanup) },
    },
    '../../../entities/word': { getRecording: async () => new Blob(['recording'], { type: 'audio/recording' }) },
    '../../../shared/lib/audio/playAudio': audio,
    '../../../shared/lib/tts/speech': {
      prepareSpeech: async () => { gesture = false },
      speakText: async () => 'finished',
      stopSpeech() {},
    },
  }, { Audio, localStorage: { getItem: () => null } })

  return {
    audio, elements, urls, played, states,
    set failure(value) { failure = value },
    set autoEnd(value) { autoEnd = value },
    set stopAfter(value) { stopAfter = value },
    start(recording = true) {
      gesture = true
      player = hook.useSessionPlayer([
        { _id: 'one', original: 'one', translation: 'uno', sourceLanguage: 'en', targetLanguage: 'es', hasRecording: recording },
        { _id: 'two', original: 'two', translation: 'dos', sourceLanguage: 'en', targetLanguage: 'es', hasRecording: recording },
      ], 0)
      return { player, finished: player.play() }
    },
    dispose() { cleanups.forEach((cleanup) => cleanup()) },
  }
}

test('recordings continue through multiple cycles on the element authorized by the click', async () => {
  const env = environment()
  env.stopAfter = 5
  const { finished } = env.start()
  await finished
  assert.equal(env.played.length, 5)
  assert.equal(env.elements.length, 1)
  assert.equal(env.elements[0].authorized, true)
  assert.equal(env.urls.size, 0)
  env.dispose()
})

test('a rejected authorization reports the original playback error and releases its URL', async () => {
  const env = environment()
  env.failure = new DOMException('Gesture required', 'NotAllowedError')
  await env.start().finished
  assert.ok(env.states.some((value) => typeof value === 'string' && value.includes('NotAllowedError')))
  assert.equal(env.played.length, 0)
  assert.equal(env.urls.size, 0)
  env.dispose()
})

test('stop during authorization cancels the old run without starting a recording', async () => {
  const env = environment()
  env.autoEnd = false
  const { player, finished } = env.start()
  player.stop()
  await finished
  assert.equal(env.played.length, 0)
  assert.equal(env.urls.size, 0)
  env.dispose()
})

test('TTS-only sessions do not create or unlock an audio element', async () => {
  const env = environment()
  const { player, finished } = env.start(false)
  setTimeout(() => player.stop(), 5)
  await finished
  assert.equal(env.elements.length, 0)
  env.dispose()
})

test('late play rejection after stop cannot clear the next recording', async () => {
  const env = environment()
  env.autoEnd = false
  const error = new DOMException('Interrupted', 'AbortError')
  let rejectFirst
  const element = { pause() {}, removeAttribute() {}, load() {}, play: () => new Promise((_, reject) => { rejectFirst = reject }) }
  const first = env.audio.playAudio(new Blob(['first']), element)
  first.stop()
  element.play = () => Promise.resolve()
  const second = env.audio.playAudio(new Blob(['second']), element)
  rejectFirst(error)
  await first.finished
  await Promise.resolve()
  assert.equal(env.urls.size, 1)
  second.stop()
  await second.finished
  assert.equal(env.urls.size, 0)
})
