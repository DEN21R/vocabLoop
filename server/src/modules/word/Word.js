import mongoose from 'mongoose'

const wordSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  original: {
    type: String,
    required: true,
    trim: true,
  },
  translation: {
    type: String,
    required: true,
    trim: true,
  },
  recordingData: {
    type: Buffer,
    select: false,
  },
  recordingMimeType: {
    type: String,
  },
  hasRecording: {
    type: Boolean,
    default: false,
  },
  sourceLanguage: {
    type: String,
    required: true,
    trim: true,
  },
  targetLanguage: {
    type: String,
    required: true,
    trim: true,
  },
})

wordSchema.set('timestamps', true)

const Word = mongoose.model('Word', wordSchema)

export default Word
