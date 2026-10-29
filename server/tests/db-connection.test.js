import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

function environment() {
  let calls = 0
  let settle
  let reject
  const options = []
  const mongoose = {
    connection: { readyState: 0 },
    connect(uri, settings) {
      calls++
      options.push(settings)
      mongoose.connection.readyState = 2
      return new Promise((resolve, fail) => {
        settle = () => { mongoose.connection.readyState = 1; resolve(mongoose) }
        reject = () => { mongoose.connection.readyState = 0; fail(new Error('Connection refused')) }
      })
    },
  }
  const source = readFileSync(new URL('../src/config/db.js', import.meta.url), 'utf8')
    .replace("import mongoose from 'mongoose'", '')
    .replace('export const connectDB', 'const connectDB')
  const env = { MONGO_URI: 'mongodb://test-only-placeholder' }
  const { connectDB } = new Function('mongoose', 'process', 'console', `${source}\nreturn { connectDB }`)(
    mongoose, { env }, { log() {} },
  )
  return {
    connectDB, mongoose, env, options,
    get calls() { return calls },
    resolve() { settle() }, reject() { reject() },
  }
}

test('concurrent requests wait for one real connection instead of querying early', async () => {
  const env = environment()
  let ready = 0
  const requests = Array.from({ length: 10 }, () => env.connectDB().then(() => ready++))
  await Promise.resolve()
  assert.equal(env.calls, 1)
  assert.equal(ready, 0)
  env.resolve()
  await Promise.all(requests)
  assert.equal(ready, 10)
  assert.deepEqual(env.options, [{ maxPoolSize: 5, serverSelectionTimeoutMS: 10000 }])
})

test('connected instances reuse the existing pool', async () => {
  const env = environment()
  const pending = env.connectDB()
  env.resolve()
  await pending
  assert.equal(await env.connectDB(), env.mongoose)
  assert.equal(env.calls, 1)
})

test('failed connection rejects all waiting requests and allows retry', async () => {
  const env = environment()
  const first = assert.rejects(env.connectDB(), /Connection refused/)
  const second = assert.rejects(env.connectDB(), /Connection refused/)
  env.reject()
  await Promise.all([first, second])
  const retry = env.connectDB()
  assert.equal(env.calls, 2)
  env.resolve()
  await retry
})

test('a later disconnection does not reuse a fulfilled stale promise', async () => {
  const env = environment()
  const first = env.connectDB()
  env.resolve()
  await first
  env.mongoose.connection.readyState = 0
  const next = env.connectDB()
  assert.equal(env.calls, 2)
  env.resolve()
  await next
})

test('an already connecting mongoose instance is awaited with asPromise', async () => {
  const env = environment()
  env.mongoose.connection.readyState = 2
  let finish
  let ready = false
  env.mongoose.connection.asPromise = () => new Promise((resolve) => { finish = resolve })
  const pending = env.connectDB().then(() => { ready = true })
  await Promise.resolve()
  assert.equal(ready, false)
  assert.equal(env.calls, 0)
  finish()
  await pending
})

test('missing configuration fails explicitly without attempting a connection', async () => {
  const env = environment()
  delete env.env.MONGO_URI
  await assert.rejects(env.connectDB(), /MONGO_URI is not configured/)
  assert.equal(env.calls, 0)
})
