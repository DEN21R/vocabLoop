export interface ListeningSession {
  _id: string
  name: string
  words: string[]
  intervalSeconds: number
  createdAt: string
  updatedAt: string
}

export interface SessionInput {
  name: string
  words: string[]
  intervalSeconds: number
}
