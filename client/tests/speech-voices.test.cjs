const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { test } = require('node:test')
const ts = require('typescript')

function environment() {
  let voices = []
  const polls = new Set()
  const timeouts = new Set()
  const listeners = new Set()
  const spoken = []
  const synth = {
    getVoices: () => voices,
    addEventListener: (_, listener) => listeners.add(listener),
    removeEventListener: (_, listener) => listeners.delete(listener),
    speak: (utterance) => spoken.push(utterance),
  }
  const Utterance = class {}
  const source = readFileSync(resolve(__dirname, '../src/shared/lib/tts/speech.ts'), 'utf8')
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  }).outputText
  const module = { exports: {} }
  new Function('module', 'exports', 'window', 'SpeechSynthesisUtterance', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', code)(
    module, module.exports, { speechSynthesis: synth, SpeechSynthesisUtterance: Utterance }, Utterance,
    (fn) => { polls.add(fn); return fn }, (fn) => polls.delete(fn),
    (fn) => { timeouts.add(fn); return fn }, (fn) => timeouts.delete(fn),
  )
  return {
    ...module.exports, polls, timeouts, listeners, spoken,
    set voices(value) { voices = value },
    poll() { [...polls].forEach((fn) => fn()) },
    expire() { [...timeouts].forEach((fn) => fn()) },
    event() { [...listeners].forEach((fn) => fn()) },
    assertClean() {
      assert.equal(polls.size, 0)
      assert.equal(timeouts.size, 0)
      assert.equal(listeners.size, 0)
    },
  }
}

test('Android locale spelling works for filtering, preparation and utterance language', async () => {
  const env = environment()
  const us = { lang: 'EN_US', voiceURI: 'us' }
  const gb = { lang: 'en-GB', voiceURI: 'gb' }
  env.voices = [us, gb, { lang: 'ru_RU', voiceURI: 'ru' }]
  assert.deepEqual(env.getVoicesByLanguage(env.getAvailableVoices(), 'en'), [us, gb])
  await env.prepareSpeech(['en', 'ru'])
  env.assertClean()
  const finished = env.speakText({ text: 'hello', language: 'en_US' })
  assert.equal(env.spoken[0].voice, us)
  assert.equal(env.spoken[0].lang, 'en-us')
  env.spoken[0].onend()
  assert.equal(await finished, 'finished')
  env.assertClean()
})

test('polling loads voices without voiceschanged and waits for all requested languages', async () => {
  const env = environment()
  let ready = false
  const pending = env.prepareSpeech(['en', 'ru']).then(() => { ready = true })
  env.voices = [{ lang: 'en_US' }]
  env.poll()
  await Promise.resolve()
  assert.equal(ready, false)
  env.voices = [{ lang: 'en_US' }, { lang: 'ru_RU' }]
  env.poll()
  await pending
  env.assertClean()
})

test('voiceschanged resolves loading and removes listeners and timers', async () => {
  const env = environment()
  const pending = env.prepareSpeech(['uk'])
  env.voices = [{ lang: 'uk_UA' }]
  env.event()
  await pending
  env.assertClean()
})

test('deadline rechecks voices even when neither event nor poll ran', async () => {
  const env = environment()
  const pending = env.prepareSpeech(['de'])
  env.voices = [{ lang: 'de_DE' }]
  env.expire()
  await pending
  env.assertClean()
})

test('empty browser list fails and a later attempt can recover', async () => {
  const env = environment()
  const pending = env.prepareSpeech(['en'])
  const rejected = assert.rejects(pending, Error)
  env.expire()
  await rejected
  env.assertClean()
  env.voices = [{ lang: 'en_US' }]
  await env.prepareSpeech(['en'])
  env.assertClean()
})

test('a missing language is identified at the deadline', async () => {
  const env = environment()
  env.voices = [{ lang: 'en_US' }]
  const pending = env.prepareSpeech(['en', 'uk'])
  const rejected = assert.rejects(pending, /uk/)
  env.expire()
  await rejected
  env.assertClean()
})
