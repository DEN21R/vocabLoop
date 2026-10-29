const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const { readFileSync, existsSync } = require('node:fs')
const { resolve, sep } = require('node:path')
const { test } = require('node:test')

const root = resolve(__dirname, '../public/licenses/piper')
const read = (file) => readFileSync(resolve(root, file), 'utf8')

test('upstream license texts, build recipe and model cards retain their recorded bytes', () => {
  const provenance = JSON.parse(read('provenance.json'))
  for (const material of provenance.materials) {
    const bytes = readFileSync(resolve(root, material.file))
    assert.equal(bytes.length, material.bytes, material.file)
    assert.equal(createHash('sha256').update(bytes).digest('hex'), material.sha256, material.file)
    assert(material.url.startsWith('https://'))
  }
  assert.equal(provenance.npmGitHead, '69522c832bd52d7c16389e9a8aee568065027689')
  assert.equal(provenance.binaries.length, 2)
})

test('published notices include full MIT/GPL terms and explicit source and warranty directions', () => {
  assert.match(read('ONNX-Runtime-MIT.txt'), /Copyright \(c\) Microsoft Corporation/)
  assert.match(read('ONNX-Runtime-MIT.txt'), /Permission is hereby granted, free of charge/)
  assert.match(read('ONNX-Runtime-MIT.txt'), /this permission notice shall be included/)
  assert.match(read('GPL-3.0.txt'), /Version 3, 29 June 2007/)
  assert.match(read('GPL-3.0.txt'), /Corresponding Source/)
  assert.match(read('SOURCE.txt'), /WITHOUT ANY WARRANTY|NO\s+WARRANTY/)
  assert.match(read('SOURCE.txt'), /codeload\.github\.com\/rhasspy\/espeak-ng\/tar.gz\/0f65aa301e0d6bae5e172cc74197d32a6182200f/)
  assert.match(read('SOURCE.txt'), /codeload\.github\.com\/rhasspy\/espeak-ng\/tar.gz\/8593723f10cfd9befd50de447f14bf0a9d2a14a4/)
})

test('every local link on the phone license page resolves to a supplied public file', () => {
  const publicRoot = resolve(__dirname, '../public')
  const links = [...read('index.html').matchAll(/href="([^"]+)"/g)].map((match) => match[1])
  assert(links.length > 10)
  for (const link of links.filter((value) => !value.startsWith('https://'))) {
    const target = resolve(root, link)
    assert(target.startsWith(publicRoot + sep), link)
    assert(existsSync(target), link)
  }
})

test('additional voices retain attribution and full Creative Commons terms', () => {
  assert.match(read('CC-BY-4.0.txt'), /Attribution 4.0 International/)
  assert.match(read('CC-BY-SA-4.0.txt'), /Attribution-ShareAlike 4.0 International/)
  assert.match(read('VOICE-SELECTION.txt'), /Copyright 2018, 2019 Google, Inc/)
  assert.match(read('VOICE-SELECTION.txt'), /Valentini-Botinhao, Cassia; Yamagishi, Junichi/)
  assert.match(read('Alba-dataset-license.txt'), /moral rights/)
})
