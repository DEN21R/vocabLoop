import { Router } from 'express'
import { protect } from '../auth/auth.middleware.js'
import { createSession, getSessions, getSession, updateSession, deleteSession } from './listeningSession.controller.js'

const listeningSessionRouter = Router()

listeningSessionRouter.use(protect)
listeningSessionRouter.post('/', createSession)
listeningSessionRouter.get('/', getSessions)
listeningSessionRouter.get('/:id', getSession)
listeningSessionRouter.patch('/:id', updateSession)
listeningSessionRouter.delete('/:id', deleteSession)

export default listeningSessionRouter
