import mongoose from 'mongoose'

const listeningSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    words: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Word' }],
      default: [],
    },
    intervalSeconds: { type: Number, default: 3, min: 0, max: 60 },
  },
  { timestamps: true },
)

export default mongoose.model('ListeningSession', listeningSessionSchema)
