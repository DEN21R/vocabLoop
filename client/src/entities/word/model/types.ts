export interface IWord {
  _id: string
  original: string
  translation: string
  hasRecording?: boolean
  sourceLanguage: string
  targetLanguage: string
  createdAt: string
  updatedAt: string
}
