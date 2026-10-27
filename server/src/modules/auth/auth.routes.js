import { Router } from 'express'
import { login, register } from './auth.controller.js'
import { protect } from './auth.middleware.js'
import { me } from './auth.controller.js'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.get('/me', protect, me)

export default router
