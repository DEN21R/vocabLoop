import app from '../server/src/app.js'
import { connectDB } from '../server/src/config/db.js'

export default async function handler(req, res) {
  try {
    await connectDB()
    return app(req, res)
  } catch (error) {
    console.error('MongoDB connection failed:', error)
    return res.status(500).json({ error: 'Database connection failed' })
  }
}
