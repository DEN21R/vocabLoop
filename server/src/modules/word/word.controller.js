import Word from './Word.js'
import { translateText } from '../../services/translationService.js'

export const createWord = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ message: 'Request body must be an object' })
    }
    const { original, sourceLanguage, targetLanguage } = req.body
    if (
      typeof original !== 'string' ||
      typeof sourceLanguage !== 'string' ||
      typeof targetLanguage !== 'string'
    ) {
      return res.status(400).json({
        message: 'All fields are not string',
      })
    }

    const languages = ['ru', 'en', 'uk', 'de']

    const cleanOriginal = original.trim()
    const cleanSourceLanguage = sourceLanguage.trim()
    const cleanTargetLanguage = targetLanguage.trim()
    if (!cleanOriginal || !cleanSourceLanguage || !cleanTargetLanguage) {
      return res.status(400).json({
        message: 'All fields are required',
      })
    }

    if (
      !languages.includes(cleanSourceLanguage) ||
      !languages.includes(cleanTargetLanguage)
    ) {
      return res
        .status(400)
        .json({ message: 'Sorry, that language is not in the database' })
    }

    if (cleanOriginal.length > 200) {
      return res.status(400).json({ message: 'The word very long' })
    }

    if (cleanSourceLanguage === cleanTargetLanguage) {
      return res.status(400).json({
        message: 'The languages ​​are the same',
      })
    }

    const translation = await translateText({
      text: cleanOriginal,
      sourceLanguage: cleanSourceLanguage,
      targetLanguage: cleanTargetLanguage,
    })

    const newWord = await Word.create({
      user: req.user?.id,
      original: cleanOriginal,
      translation,
      sourceLanguage: cleanSourceLanguage,
      targetLanguage: cleanTargetLanguage,
    })
    return res.status(201).json({ word: newWord })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export const getWords = async (req, res) => {
  try {
    const currentWords = await Word.find({ user: req.user.id }).sort({
      createdAt: -1,
    })
    res.status(200).json({
      words: currentWords,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get worlds' })
  }
}

export const deleteWord = async (req, res) => {
  try {
    const { id } = req.params
    const user = req.user.id

    const word = await Word.findOneAndDelete({ _id: id, user })

    if (!word) {
      return res.status(404).json({ error: 'Word not found in this group' })
    }

    return res.status(200).json({ message: 'Word deleted' })
  } catch (error) {
    return res.status(400).json({ error: 'Failed to delete word' })
  }
}

export const saveRecording = async (req, res) => {
  try {
    const id = req.params.id
    const user = req.user.id
    const word = await Word.findOne({ _id: id, user: user })

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ message: 'Нет записи' })
    }

    if (!word) {
      return res.status(404).json({ message: 'Слово не найдено ' })
    }

    const mimeType = req.get('Content-Type')

    const isSupportedAudio = req.is(['audio/webm', 'audio/ogg', 'audio/mp4'])
    if (!isSupportedAudio) {
      return res.status(415).json({ message: 'Формат аудио не поддерживается' })
    }

    word.recordingData = req.body
    word.recordingMimeType = mimeType
    word.hasRecording = true

    await word.save()

    return res.status(200).json({
      message: 'Запись сохранена',
      hasRecording: true,
    })
  } catch {
    res.status(500).json({ message: 'Не удалось сохранить запись' })
  }
}

export const getRecording = async (req, res) => {
  try {
    const id = req.params.id
    const user = req.user.id

    const currentWord = await Word.findOne({ _id: id, user: user }).select(
      '+recordingData',
    )
    if (!currentWord) {
      return res.status(404).json({ message: 'Слово не найдено' })
    }

    if (!currentWord.recordingData) {
      return res.status(404).json({ message: 'У слова нет записи' })
    }

    res.set('Content-Type', currentWord.recordingMimeType)
    return res.status(200).send(currentWord.recordingData)
  } catch (error) {
    res.status(500).json({ message: 'Не удалось получить запись' })
  }
}

export const deleteRecording = async (req, res) => {
  try {
    const id = req.params.id
    const user = req.user.id

    const word = await Word.findOne({ _id: id, user: user })

    if (!word) {
      return res.status(404).json({ message: 'слово не найдено' })
    }

    await word.updateOne({
      $unset: {
        recordingData: 1,
        recordingMimeType: 1,
      },
      $set: {
        hasRecording: false,
      },
    })

    return res.status(200).json({
      message: 'Запись удалена',
      hasRecording: false,
    })
  } catch (error) {
    res.status(500).json({ message: 'Не удалось удалить запись' })
  }
}
