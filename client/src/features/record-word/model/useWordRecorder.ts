import { useEffect, useRef, useState } from 'react'

export function useWordRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    return () => {
      cancelledRef.current = true

      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }

      const recorder = recorderRef.current

      if (recorder) {
        recorder.ondataavailable = null
        recorder.onstop = null

        if (recorder.state !== 'inactive') {
          recorder.stop()
        }
      }

      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  function releaseMicrophone() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  async function startRecording() {
    if (isStarting || isRecording) return
    cancelledRef.current = false
    setIsStarting(true)
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      })

      if (cancelledRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder

      const chunks: Blob[] = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType })
        setAudioBlob(blob)
      }

      recorder.start()
      setIsRecording(true)
      timerRef.current = setTimeout(stopRecording, 30_000)
    } catch {
      if (cancelledRef.current) return
      releaseMicrophone()
      setError('Не удалось начать запись. Проверь доступ к микрофону.')
    } finally {
      setIsStarting(false)
    }
  }

  function stopRecording() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const recorder = recorderRef.current

    if (!recorder || recorder.state === 'inactive') return

    recorder.stop()
    releaseMicrophone()

    setIsRecording(false)
  }
  function cancelRecording() {
    cancelledRef.current = true

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    const recorder = recorderRef.current

    if (recorder) {
      recorder.ondataavailable = null
      recorder.onstop = null

      if (recorder.state !== 'inactive') {
        recorder.stop()
      }
    }

    releaseMicrophone()
    recorderRef.current = null
    setIsRecording(false)
    setAudioBlob(null)
    setError(null)
  }
  return {
    isRecording,
    isStarting,
    error,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording,
  }
}
