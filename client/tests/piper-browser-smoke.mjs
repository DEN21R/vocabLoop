// Optional real-WASM smoke test, no browser automation dependency.
// First: npm run build && npm run preview -- --host 127.0.0.1 --port 4173
// Then: node tests/piper-browser-smoke.mjs
// Override PIPER_CHROME_PATH for a Chromium executable outside Windows defaults.
// PIPER_SIMULATE_SAFARI=1 disables createWritable inside test Workers and seeds
// the empty OPFS config left by upstream on old Safari. This is not a real iPhone.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const client = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const executable = process.env.PIPER_CHROME_PATH ?? [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync)
assert(executable, 'Set PIPER_CHROME_PATH to a Chromium executable')
const worker = readdirSync(resolve(client, 'dist/assets')).find((file) => file.startsWith('piperProbe.worker-'))
assert(worker, 'Build the client first')
const temp = resolve(client, 'node_modules/.tmp')
mkdirSync(temp, { recursive: true })
const profile = mkdtempSync(resolve(temp, 'piper-browser-'))
const origin = 'http://127.0.0.1:4173'
const simulateOldSafari = process.env.PIPER_SIMULATE_SAFARI === '1'
const chrome = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
let ws
try {
  const debugUrl = await new Promise((resolve, reject) => {
    let buffer = ''
    const timer = setTimeout(() => reject(Error('Chrome startup timeout')), 20_000)
    chrome.stderr.on('data', (chunk) => {
      buffer += chunk
      const match = buffer.match(/DevTools listening on (ws:\/\/[^\s]+)/)
      if (match) { clearTimeout(timer); resolve(match[1]) }
    })
    chrome.once('error', (error) => { clearTimeout(timer); reject(error) })
  })
  const port = new URL(debugUrl).port
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  ws = new WebSocket(pages.find((page) => page.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }))
  let id = 0
  const pending = new Map()
  const call = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const requestId = ++id
    pending.set(requestId, { resolve, reject })
    ws.send(JSON.stringify({ id: requestId, method, params, sessionId }))
  })
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data)
    if (message.id) {
      const promise = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) promise.reject(Error(JSON.stringify(message.error)))
      else promise.resolve(message.result)
    } else if (message.method === 'Target.attachedToTarget') {
      void call('Runtime.enable', {}, message.params.sessionId)
    } else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      console.error('Browser:', message.params.args.map((arg) => arg.value ?? arg.description).join(' '))
    }
  }
  const evaluate = async (expression) => {
    const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  await call('Runtime.enable')
  await call('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true })
  await call('Page.navigate', { url: origin })
  for (let i = 0; i < 200; i++) {
    if (await evaluate('location.origin + " " + document.readyState') === `${origin} complete`) break
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  assert.equal(await evaluate('location.origin'), origin)
  console.log('Browser:', await (await fetch(`http://127.0.0.1:${port}/json/version`)).json().then((value) => value.Browser))
  if (simulateOldSafari) await evaluate(`(async()=>{
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('piper', {create:true});
    await dir.getFileHandle('en_US-ljspeech-medium.onnx.json', {create:true});
  })()`)
  const cases = simulateOldSafari ? [['en', 'hello'], ['en', 'hello'], ['de', 'Hallo'], ['de', 'Hallo'], ['ru', 'привет'], ['ru', 'привет'], ['uk', 'привіт'], ['uk', 'їжак']] : [['en', 'hello'], ['de', 'Hallo'], ['ru', 'привет'], ['uk', 'привіт'],
    ['uk', 'їжак'], ['uk', 'ґанок'], ['uk', 'єдність'], ['uk', 'Україна'], ['uk', 'з’їсти'], ['uk', 'приві́т'], ['en', 'hello']]
  const results = []
  for (const [language, text] of cases) {
    const started = Date.now()
    const result = await evaluate(`new Promise(resolve => {
      const simulateOldSafari = ${simulateOldSafari};
      const wrapper = simulateOldSafari ? URL.createObjectURL(new Blob([
        'FileSystemFileHandle.prototype.createWritable = undefined; await import(' + JSON.stringify(location.origin + '/assets/${worker}') + '); self.postMessage({type:"test-ready"});'
      ], {type:'text/javascript'})) : null;
      const worker = new Worker(wrapper || '/assets/${worker}', { type: 'module' });
      const statuses = [];
      const done = value => { clearTimeout(timer); worker.terminate(); if(wrapper)URL.revokeObjectURL(wrapper); resolve(value); };
      const timer = setTimeout(() => done({error:'timeout'}), 180000);
      worker.onerror = event => done({error:event.message});
      worker.onmessage = async ({data}) => {
        if(data.type === 'test-ready') { worker.postMessage(${JSON.stringify({ language, text })}); return; }
        if (data.type === 'error') return done({error:data.message});
        if (data.type === 'status') { statuses.push(data.message); return; }
        try {
          const buffer = await data.audio.arrayBuffer(); const rate = new DataView(buffer).getUint32(24,true);
          const context = new AudioContext(); const decoded = await context.decodeAudioData(buffer);
          let peak = 0; for (const value of decoded.getChannelData(0)) peak = Math.max(peak, Math.abs(value));
          await context.close();
          done({bytes:data.audio.size, rate, duration:decoded.duration, peak, statuses});
        } catch(error) { done({error:String(error)}); }
      };
      if(!simulateOldSafari)worker.postMessage(${JSON.stringify({ language, text })});
    })`)
    assert(!result.error, `${language}/${text}: ${result.error}`)
    assert(result.bytes > 44 && result.duration > 0.05 && result.peak > 0 && Number.isFinite(result.peak), JSON.stringify(result))
    results.push({ language, text, ...result })
    console.log(JSON.stringify({ language, text, ms: Date.now() - started, ...result, statuses: [result.statuses[0], result.statuses.at(-1)] }))
  }
  assert(results.find((result) => result.text === 'їжак').statuses.some((status) => status.includes('из кэша')), 'UK model must be reused from CacheStorage')
  assert(!results.filter((result) => result.language === 'en').at(-1).statuses.some((status) => status.includes('загружено')), 'EN model must be reused from OPFS')
  if (simulateOldSafari) {
    assert(results[0].statuses.some((status) => status.includes('повреждённый кэш')), 'Repair old empty OPFS config')
    assert(!results[1].statuses.some((status) => status.includes('Совместимая запись')), 'Reuse repaired model on the second call')
  }
  console.log(simulateOldSafari ? 'PASS: simulated old Safari OPFS, corrupt config repair, repeated EN/DE/RU/UK.' : 'PASS: all four languages, Ukrainian letters/apostrophe/stress, model cache reuse.')
} finally {
  ws?.close()
  chrome.kill()
}
