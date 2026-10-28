const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { test } = require('node:test')
const ts = require('typescript')

function environment() {
  const utterances = []
  const timers = new Set()
  const synth = {
    getVoices: () => [{ lang: 'en', voiceURI: 'test' }],
    speak: (utterance) => utterances.push(utterance),
    cancel() { utterances.at(-1)?.onerror?.({ error: 'interrupted' }) },
    resume() {},
  }
  const source = readFileSync(resolve(__dirname, '../src/shared/lib/tts/speech.ts'), 'utf8')
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  }).outputText
  const module = { exports: {} }
  new Function('module', 'exports', 'window', 'SpeechSynthesisUtterance', 'setInterval', 'clearInterval', code)(
    module, module.exports, { speechSynthesis: synth }, class {},
    (callback) => { timers.add(callback); return callback },
    (callback) => timers.delete(callback),
  )
  return {
    ...module.exports, utterances, timers,
    speak() { return module.exports.speakText({ text: 'hello', language: 'en' }) },
  }
}

for (const error of ['interrupted', 'canceled']) {
  test(`${error} is cancellation, releases the active utterance and allows restart`, async () => {
    const env = environment()
    const first = env.speak()
    env.utterances[0].onerror({ error })
    assert.equal(await first, 'cancelled')
    assert.equal(env.timers.size, 0)
    const next = env.speak()
    env.utterances[1].onend()
    assert.equal(await next, 'finished')
    assert.equal(env.timers.size, 0)
  })
}

test('stop handles synchronous interruption and ignores a late callback after restart', async () => {
  const env = environment()
  const first = env.speak()
  const lateError = env.utterances[0].onerror
  env.stopSpeech()
  assert.equal(await first, 'cancelled')
  const next = env.speak()
  lateError({ error: 'interrupted' })
  assert.equal(env.timers.size, 1)
  env.utterances[1].onend()
  assert.equal(await next, 'finished')
  assert.equal(env.timers.size, 0)
})

test('real speech failures still reject and clean up', async () => {
  const env = environment()
  const speech = env.speak()
  const rejected = assert.rejects(speech, /synthesis-failed/)
  env.utterances[0].onerror({ error: 'synthesis-failed' })
  await rejected
  assert.equal(env.timers.size, 0)
})
