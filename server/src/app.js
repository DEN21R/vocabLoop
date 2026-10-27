import express from 'express'
import cors from 'cors'
import authRoutes from './modules/auth/auth.routes.js'
import wordRouter from './modules/word/word.routes.js'
import listeningSessionRouter from './modules/listening-session/listeningSession.routes.js'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/auth', authRoutes)
app.use('/words', wordRouter)
app.use('/listening-sessions', listeningSessionRouter)

export default app
