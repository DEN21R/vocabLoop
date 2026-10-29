const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { test } = require('node:test')
const ts = require('typescript')

function load(file, imports = {}, globals = {}) {
  const code = ts.transpileModule(readFileSync(resolve(__dirname, '../src/features/play-listening-session/model', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', ...Object.keys(globals), code)(
    (name) => imports[name], module, module.exports, ...Object.values(globals),
  )
  return module.exports
}
const { textPhonemeIds, pcmWav } = load('piperText.ts')
// Actual IDs from the pinned uk_UA-ukrainian_tts-medium config (not eSpeak's table).
const config = {
  phoneme_type: 'text', num_symbols: 256,
  phoneme_id_map: { _: [0], '^': [1], $: [2], "'": [5], в: [14], ґ: [16], є: [19], и: [22], і: [23], п: [31], р: [32], т: [34], '́': [45], '̆': [46], '̈': [47] },
  audio: { sample_rate: 22050 }, inference: { noise_scale: 0.667, length_scale: 1, noise_w: 0.8 },
  speaker_id_map: { lada: 0, mykyta: 1, tetiana: 2 },
}

test('Ukrainian text uses model IDs with native Piper BOS/pad/EOS, never eSpeak 142', () => {
  assert.deepEqual(textPhonemeIds('привіт', config), [1, 0, 31, 0, 32, 0, 22, 0, 14, 0, 23, 0, 34, 0, 2])
})
test('Ukrainian uppercase Ї/Й/Ґ/Є, NFD and explicit stress preserve model phonemes', () => {
  assert.deepEqual(textPhonemeIds('ЇЙҐЄ', config), [1, 0, 23, 0, 47, 0, 22, 0, 46, 0, 16, 0, 19, 0, 2])
  assert.deepEqual(textPhonemeIds('ї', config), textPhonemeIds('і\u0308', config))
  assert(textPhonemeIds('приві́т', config).includes(45))
  assert.deepEqual(textPhonemeIds('і’і', config), textPhonemeIds("і'і", config))
})
test('unsupported symbols and corrupt IDs fail rather than dropping or clamping phonemes', () => {
  assert.throws(() => textPhonemeIds('привіт2', config), /не поддерживает символ/u)
  assert.throws(() => textPhonemeIds('hello', config), /не поддерживает символ/u)
  assert.throws(() => textPhonemeIds('і', { ...config, num_symbols: 23 }), /не поддерживает символ/u)
  assert.throws(() => textPhonemeIds('і', { ...config, phoneme_type: 'espeak' }), /текстовая/u)
})
test('WAV is mono PCM16 with correct sizes, sample rate, saturation and invalid-output rejection', async () => {
  const blob = pcmWav(Float32Array.of(-2, 0, 2), 22050)
  const buffer = await blob.arrayBuffer()
  const view = new DataView(buffer)
  assert.equal(new TextDecoder().decode(buffer.slice(0, 4)), 'RIFF')
  assert.equal(view.getUint32(4, true), buffer.byteLength - 8)
  assert.equal(view.getUint16(22, true), 1)
  assert.equal(view.getUint32(24, true), 22050)
  assert.equal(view.getUint32(40, true), 6)
  assert.deepEqual([44, 46, 48].map((offset) => view.getInt16(offset, true)), [-32768, 0, 32767])
  assert.throws(() => pcmWav(Float32Array.of(NaN), 22050), /некорректное/u)
  assert.throws(() => pcmWav(new Float32Array(), 22050), /пустое/u)
})
test('worker request validation accepts only four languages and nonempty dictionary text', () => {
  const { validatePiperRequest } = load('piper.ts')
  for (const language of ['en', 'de', 'ru', 'uk']) assert(validatePiperRequest({ language, text: 'test' }).voiceId)
  assert(validatePiperRequest({ language: 'en', text: 'a'.repeat(200) }).text)
  for (const request of [{ language: 'xx', text: 'a' }, { language: '__proto__', text: 'a' }, { language: 'uk', text: ' ' }]) {
    assert.throws(() => validatePiperRequest(request))
  }
})
test('Piper diagnostics retain original error type/message, stage, language and model', () => {
  const { piperError } = load('piper.ts')
  const message = piperError(new SyntaxError('Unexpected end of JSON input'), { language: 'en', stage: 'config' })
  for (const expected of ['SyntaxError', 'Unexpected end of JSON input', 'config', 'en_US-ljspeech-medium']) assert(message.includes(expected))
  assert(piperError(new DOMException('Connection lost', 'NetworkError'), { language: 'uk', stage: 'model' }).includes('NetworkError: Connection lost'))
})
for (const [speaker, sid] of Object.entries(config.speaker_id_map)) for (const runFails of [false, true]) {
  test(`Ukrainian ${speaker} runs without storage and releases its ONNX session on ${runFails ? 'failure' : 'success'}`, async () => {
    let released = 0
    let received
    class Tensor { constructor(type, data, dimensions) { Object.assign(this, { type, data, dimensions }) } }
    const ort = { env: { wasm: {} }, Tensor, InferenceSession: { async create() {
      return {
        async run(feeds) { received = feeds; if (runFails) throw Error('inference failed'); return { output: { data: Float32Array.of(0, 0.2, -0.2) } } },
        async release() { released++ },
      }
    } } }
    const { predictUkrainian } = load('piperUkrainian.ts', { './piperText': { textPhonemeIds, pcmWav }, 'onnxruntime-web': ort }, {
      caches: { open() { throw Error('storage disabled') } },
      fetch: async (url) => url.endsWith('.json') ? Response.json(config) : new Response(new Uint8Array([1, 2, 3])),
    })
    const promise = predictUkrainian('привіт', () => {}, speaker)
    if (runFails) await assert.rejects(promise, /inference failed/)
    else assert.equal((await promise).type, 'audio/wav')
    assert.equal(released, 1)
    assert.deepEqual([...received.sid.data], [BigInt(sid)])
    assert.deepEqual([...received.input.data], textPhonemeIds('привіт', config).map(BigInt))
    assert.equal(ort.env.wasm.numThreads, 1)
  })
}

test('every listed voice validates only for its language and retains model/speaker identity', () => {
  const { PIPER_VOICES, validatePiperRequest, piperError } = load('piper.ts')
  for (const [language, entry] of Object.entries(PIPER_VOICES)) for (const voice of entry.voices) {
    const result = validatePiperRequest({ language, text: 'слово', voice: voice.id })
    assert.equal(result.voiceId, voice.modelId)
    assert.equal(result.speaker, voice.speaker)
    assert.equal(result.choiceId, voice.id)
    assert(piperError(Error('test'), { language, voice: voice.id, stage: 'model' }).includes(voice.modelId))
    const other = language === 'en' ? 'uk' : 'en'
    assert.throws(() => validatePiperRequest({ language: other, text: 'test', voice: voice.id }))
  }
  assert.throws(() => validatePiperRequest({ language: 'en', text: 'test', voice: 'unlisted' }))
})

test('voice preferences round-trip per language and recover from invalid/blocked storage', () => {
  const { PIPER_VOICES, PIPER_SELECTION_KEY, loadPiperSelections, savePiperSelections } = load('piper.ts')
  let saved
  const storage = { getItem: () => saved, setItem: (key, value) => { assert.equal(key, PIPER_SELECTION_KEY); saved = value } }
  const defaults = loadPiperSelections(storage)
  const choices = Object.fromEntries(Object.entries(PIPER_VOICES).map(([lang, entry]) => [lang, entry.voices.at(-1).id]))
  savePiperSelections(choices, storage)
  assert.deepEqual(loadPiperSelections(storage), choices)
  saved = JSON.stringify({ en: choices.ru, uk: 'deleted-voice', ru: choices.ru })
  assert.deepEqual(loadPiperSelections(storage), { ...defaults, ru: choices.ru })
  for (saved of ['{', 'null', '[]']) assert.deepEqual(loadPiperSelections(storage), defaults)
  const blocked = { getItem() { throw Error('SecurityError') }, setItem() { throw Error('QuotaExceededError') } }
  assert.deepEqual(loadPiperSelections(blocked), defaults)
  assert.doesNotThrow(() => savePiperSelections(choices, blocked))
})
