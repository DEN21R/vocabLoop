import express from 'express'
import cors from 'cors'
import authRoutes from './modules/auth/auth.routes.js'
import wordRouter from './modules/word/word.routes.js'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/auth', authRoutes)
app.use('/words', wordRouter)

export default app
