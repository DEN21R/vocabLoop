export interface IWord {
  _id: string
  original: string
  translation: string
  hasRecording?: boolean
  isLearned?: boolean
  sourceLanguage: string
  targetLanguage: string
  createdAt: string
  updatedAt: string
}
