import assert from 'node:assert/strict'
import { PIPER_VOICES, PIPER_SELECTION_KEY } from '../src/features/play-listening-session/model/piperProbe.ts'

// Run using Vite dev + PIPER_TEST_UI=1 node tests/piper-browser-smoke.mjs.
export async function runPiperUiChecks(evaluate, call) {
  async function wait(expression, timeout = 180_000) {
    const deadline = Date.now() + timeout
    while (Date.now() < deadline) {
      if (await evaluate(expression)) return
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    throw Error(`UI timeout: ${expression}\n${await evaluate('document.body.innerText')}`)
  }
  const state = () => evaluate(`Array.from(document.querySelectorAll('[role="combobox"]')).map(e=>e.parentElement.querySelector('input').value)`)
  async function select(index, value) {
    await evaluate(`document.querySelectorAll('[role="combobox"]')[${index}].dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0}))`)
    await wait(`Array.from(document.querySelectorAll('[role="option"]')).some(e=>e.getAttribute('data-value')===${JSON.stringify(value)})`, 10_000)
    await evaluate(`Array.from(document.querySelectorAll('[role="option"]')).find(e=>e.getAttribute('data-value')===${JSON.stringify(value)}).click()`)
    await wait(`document.querySelectorAll('[role="combobox"]')[${index}].parentElement.querySelector('input').value===${JSON.stringify(value)}`, 10_000)
    await wait(`document.querySelectorAll('[role="listbox"]').length===0`, 10_000)
  }
  async function word(value) {
    await evaluate(`(()=>{const input=document.querySelector('input[maxlength="60"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`)
    await wait(`document.querySelector('input[maxlength="60"]').value===${JSON.stringify(value)}`, 10_000)
  }
  const click = (text) => evaluate(`Array.from(document.querySelectorAll('button')).find(e=>e.textContent===${JSON.stringify(text)}).click()`)
  const generate = () => click('Сгенерировать Piper')
  async function ready() {
    await wait(`!!document.querySelector('audio') || !!document.querySelector('[role="alert"]')`)
    assert.equal(await evaluate(`document.querySelector('[role="alert"]')?.textContent??''`), '')
    await wait(`document.querySelector('audio')?.readyState>=1`, 10_000)
  }
  await wait(`document.querySelectorAll('[role="combobox"]').length===2`, 20_000)
  await evaluate(`document.querySelector('details').open=true`)
  const chosen = {
    en: 'en_US-joe-medium',
    de: PIPER_VOICES.de.voices.at(-1).id,
    ru: 'ru_RU-dmitri-medium',
    uk: 'uk_UA-ukrainian_tts-medium:mykyta',
  }
  for (const [language, entry] of Object.entries(PIPER_VOICES)) {
    await select(0, language)
    await evaluate(`document.querySelectorAll('[role="combobox"]')[1].dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0}))`)
    await wait(`document.querySelectorAll('[role="option"]').length>0`, 10_000)
    assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('[role="option"]')).map(e=>e.getAttribute('data-value'))`), entry.voices.map((voice) => voice.id))
    // Close by choosing the requested voice from the already-open menu.
    await evaluate(`Array.from(document.querySelectorAll('[role="option"]')).find(e=>e.getAttribute('data-value')===${JSON.stringify(chosen[language])}).click()`)
    await wait(`document.querySelectorAll('[role="combobox"]')[1].parentElement.querySelector('input').value===${JSON.stringify(chosen[language])}`, 10_000)
    await wait(`document.querySelectorAll('[role="listbox"]').length===0`, 10_000)
  }
  assert.deepEqual(await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(PIPER_SELECTION_KEY)}))`), chosen)
  await evaluate(`window.__piperReloadToken='before'`)
  await call('Page.reload')
  await wait(`window.__piperReloadToken===undefined && document.readyState==='complete' && document.querySelectorAll('[role="combobox"]').length===2`, 20_000)
  await evaluate(`document.querySelector('details').open=true`)
  for (const language of Object.keys(PIPER_VOICES)) {
    await select(0, language)
    assert.equal((await state())[1], chosen[language])
  }
  console.log('PASS UI: per-language options, localStorage choices restored after page reload.')

  // Observe real Workers; do not replace synthesis with a fake implementation.
  await evaluate(`(()=>{const Native=window.Worker;window.__piperWorkers=[];window.__piperRequests=[];window.Worker=class extends Native{constructor(...args){super(...args);window.__piperWorkers.push(this);}postMessage(value,...args){window.__piperRequests.push(value);return super.postMessage(value,...args);}};})()`)
  // Two synchronous clicks exercise the guard before React disables the button.
  await evaluate(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(e=>e.textContent==='Сгенерировать Piper');b.click();b.click();})()`)
  assert.equal(await evaluate('window.__piperWorkers.length'), 1)
  await wait(`document.querySelectorAll('[role="combobox"]')[1].getAttribute('aria-disabled')==='true'`, 10_000)
  await ready()
  assert.equal(await evaluate('window.__piperRequests[0].voice'), chosen.uk)
  const oldUrl = await evaluate(`window.__oldPiperAudio=document.querySelector('audio');window.__oldPiperAudio.src`)
  await select(1, 'uk_UA-ukrainian_tts-medium:tetiana')
  await wait(`!document.querySelector('audio')`, 10_000)
  assert(await evaluate(`window.__oldPiperAudio.paused&&!window.__oldPiperAudio.hasAttribute('src')`))
  await generate()
  await ready()
  assert.notEqual(await evaluate(`document.querySelector('audio').src`), oldUrl)
  assert.equal(await evaluate('window.__piperRequests[1].voice'), 'uk_UA-ukrainian_tts-medium:tetiana')
  console.log('PASS UI: real Mykyta/Tetiana audio, previous voice result removed, no parallel generation.')

  await generate()
  await wait(`Array.from(document.querySelectorAll('button')).some(e=>e.textContent==='Отменить')`, 10_000)
  await click('Отменить')
  await evaluate(`window.__piperWorkers[2].dispatchEvent(new MessageEvent('message',{data:{type:'done',audio:new Blob(['stale'])}}))`)
  assert.equal(await evaluate(`!!document.querySelector('audio')`), false)
  await generate()
  await evaluate(`window.__piperWorkers[2].dispatchEvent(new MessageEvent('message',{data:{type:'error',message:'stale-error'}}))`)
  await ready()
  await word('hello') // Not in the Ukrainian model's alphabet: explicit error.
  await generate()
  await wait(`!!document.querySelector('[role="alert"]')`)
  assert.match(await evaluate(`document.querySelector('[role="alert"]').textContent`), /не поддерживает символ/u)
  assert.equal(await evaluate(`!!document.querySelector('audio')`), false)
  await word('привіт')
  await generate()
  await ready()
  console.log('PASS UI: cancellation, stale replies ignored, useful error and successful retry.')
}
