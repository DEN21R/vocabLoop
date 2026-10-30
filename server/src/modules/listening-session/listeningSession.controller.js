import mongoose from 'mongoose'
import ListeningSession from './ListeningSession.js'
import Word from '../word/Word.js'

const isId = (id) => typeof id === 'string' && mongoose.isObjectIdOrHexString(id)

// Общие проверки для создания и частичного изменения набора.
async function validateFields(body, user) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Тело запроса должно быть объектом'
  }

  if ('name' in body) {
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 100) {
      return 'Название должно содержать от 1 до 100 символов'
    }
  }

  if ('intervalSeconds' in body) {
    if (!Number.isInteger(body.intervalSeconds) || body.intervalSeconds < 0 || body.intervalSeconds > 60) {
      return 'Интервал должен быть целым числом от 0 до 60'
    }
  }

  if ('words' in body) {
    if (!Array.isArray(body.words) || !body.words.every(isId)) {
      return 'Слова должны быть массивом корректных ID'
    }
    const ids = body.words.map((id) => id.toLowerCase())
    if (new Set(ids).size !== ids.length) {
      return 'Слова не должны повторяться'
    }
    const count = await Word.countDocuments({ _id: { $in: ids }, user })
    if (count !== ids.length) {
      return 'Можно добавлять только свои существующие слова'
    }
  }

  return null
}

export const createSession = async (req, res) => {
  try {
    const error = await validateFields(req.body, req.user.id)
    if (error) return res.status(400).json({ message: error })
    if (!('name' in req.body)) {
      return res.status(400).json({ message: 'Укажите название набора' })
    }

    const { name, words = [], intervalSeconds = 3 } = req.body
    const session = await ListeningSession.create({
      user: req.user.id,
      name: name.trim(),
      words,
      intervalSeconds,
    })
    return res.status(201).json({ session })
  } catch {
    return res.status(500).json({ message: 'Не удалось создать набор' })
  }
}

export const getSessions = async (req, res) => {
  try {
    const sessions = await ListeningSession.find({ user: req.user.id }).sort({ createdAt: -1 })
    return res.status(200).json({ sessions })
  } catch {
    return res.status(500).json({ message: 'Не удалось получить наборы' })
  }
}

export const getSession = async (req, res) => {
  try {
    if (!isId(req.params.id)) {
      return res.status(400).json({ message: 'Некорректный ID набора' })
    }
    const session = await ListeningSession.findOne({ _id: req.params.id, user: req.user.id })
      .populate({
        path: 'words',
        match: { user: req.user.id },
        select: '_id original translation sourceLanguage targetLanguage hasRecording createdAt updatedAt',
      })
    if (!session) return res.status(404).json({ message: 'Набор не найден' })

    return res.status(200).json({ session })
  } catch {
    return res.status(500).json({ message: 'Не удалось открыть набор' })
  }
}

export const deleteSession = async (req, res) => {
  try {
    if (!isId(req.params.id)) {
      return res.status(400).json({ message: 'Некорректный ID набора' })
    }
    const session = await ListeningSession.findOneAndDelete({ _id: req.params.id, user: req.user.id })
    if (!session) return res.status(404).json({ message: 'Набор не найден' })
    return res.status(204).end()
  } catch {
    return res.status(500).json({ message: 'Не удалось удалить сессию' })
  }
}

export const updateSession = async (req, res) => {
  try {
    if (!isId(req.params.id)) {
      return res.status(400).json({ message: 'Некорректный ID набора' })
    }
    const session = await ListeningSession.findOne({ _id: req.params.id, user: req.user.id })
    if (!session) return res.status(404).json({ message: 'Набор не найден' })

    const error = await validateFields(req.body, req.user.id)
    if (error) return res.status(400).json({ message: error })
    if (!['name', 'words', 'intervalSeconds'].some((field) => field in req.body)) {
      return res.status(400).json({ message: 'Нет полей для изменения' })
    }

    if ('name' in req.body) session.name = req.body.name.trim()
    if ('words' in req.body) session.words = req.body.words
    if ('intervalSeconds' in req.body) session.intervalSeconds = req.body.intervalSeconds
    await session.save()

    return res.status(200).json({ session })
  } catch {
    return res.status(500).json({ message: 'Не удалось изменить набор' })
  }
}
