import { createWord } from './word.controller.js'
import { getWords } from './word.controller.js'
import { deleteWord } from './word.controller.js'
import { protect } from '../auth/auth.middleware.js'
import { saveRecording } from './word.controller.js'
import { getRecording } from './word.controller.js'
import { deleteRecording } from './word.controller.js'
import { Router, raw } from 'express'

const wordRouter = Router()

wordRouter.post('/', protect, createWord)
wordRouter.get('/', protect, getWords)
wordRouter.delete('/:id', protect, deleteWord)
wordRouter.put(
  '/:id/recording',
  protect,
  raw({ type: 'audio/*', limit: '1mb' }),
  saveRecording,
)
wordRouter.get('/:id/recording', protect, getRecording)
wordRouter.delete('/:id/recording', protect, deleteRecording)

export default wordRouter
