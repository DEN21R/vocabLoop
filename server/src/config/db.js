import mongoose from 'mongoose'

let pendingConnection = null

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return mongoose

  if (!pendingConnection) {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured')

    // Concurrent serverless requests must await the same initial connection.
    // Repeating mongoose.connect() while connecting can resolve prematurely.
    const attempt = mongoose.connection.readyState === 2
      ? mongoose.connection.asPromise()
      : mongoose.connect(process.env.MONGO_URI, {
          maxPoolSize: 5,
          serverSelectionTimeoutMS: 10000,
        })

    pendingConnection = attempt.then(() => {
      console.log('MongoDB connected')
      return mongoose
    }).finally(() => {
      // Failed attempts must not poison subsequent requests; a disconnected
      // instance must also be able to establish a new connection later.
      pendingConnection = null
    })
  }

  return pendingConnection
}
