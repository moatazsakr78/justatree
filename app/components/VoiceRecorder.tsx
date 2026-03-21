'use client'

import { useState, useRef, useEffect } from 'react'
import { MicrophoneIcon, StopIcon, XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/solid'

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => void
  onCancel: () => void
  isRecording: boolean
  setIsRecording: (value: boolean) => void
}

export default function VoiceRecorder({
  onSend,
  onCancel,
  isRecording,
  setIsRecording
}: VoiceRecorderProps) {
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isReviewing, setIsReviewing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      })

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType })
        setAudioBlob(blob)
        setIsReviewing(true)
      }

      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert('لا يمكن الوصول للميكروفون. تأكد من السماح للموقع باستخدام الميكروفون.')
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }

    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    setIsRecording(false)
  }

  // Cancel recording
  const cancelRecording = () => {
    stopRecording()
    setAudioBlob(null)
    setIsReviewing(false)
    setRecordingTime(0)
    onCancel()
  }

  // Send the recorded audio
  const sendRecording = () => {
    if (audioBlob) {
      onSend(audioBlob, recordingTime)
      setAudioBlob(null)
      setIsReviewing(false)
      setRecordingTime(0)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Recording in progress
  if (isRecording) {
    return (
      <div className="flex items-center gap-3 bg-[var(--dash-bg-raised)] rounded-full px-4 py-2 flex-1">
        {/* Cancel Button */}
        <button
          onClick={cancelRecording}
          className="p-2 text-dash-accent-red hover:text-dash-accent-red transition-colors"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        {/* Recording Indicator */}
        <div className="flex items-center gap-2 flex-1">
          <div className="w-3 h-3 bg-dash-accent-red rounded-full animate-pulse" />
          <span className="text-white text-sm font-mono">{formatTime(recordingTime)}</span>

          {/* Waveform Animation */}
          <div className="flex items-center gap-[2px] h-6 flex-1 justify-center">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-green-400 rounded-full animate-pulse"
                style={{
                  height: `${Math.random() * 100}%`,
                  animationDelay: `${i * 50}ms`
                }}
              />
            ))}
          </div>
        </div>

        {/* Stop Button */}
        <button
          onClick={stopRecording}
          className="p-2 bg-dash-accent-red hover:bg-dash-accent-red rounded-full transition-colors"
        >
          <StopIcon className="w-5 h-5 text-white" />
        </button>
      </div>
    )
  }

  // Reviewing recorded audio
  if (isReviewing && audioBlob) {
    return (
      <div className="flex items-center gap-3 bg-[var(--dash-bg-raised)] rounded-full px-4 py-2 flex-1">
        {/* Cancel Button */}
        <button
          onClick={cancelRecording}
          className="p-2 text-dash-accent-red hover:text-dash-accent-red transition-colors"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        {/* Audio Preview */}
        <div className="flex items-center gap-2 flex-1">
          <MicrophoneIcon className="w-5 h-5 text-dash-accent-green" />
          <span className="text-white text-sm">{formatTime(recordingTime)}</span>
          <audio
            src={URL.createObjectURL(audioBlob)}
            controls
            className="h-8 flex-1"
            style={{ maxWidth: '200px' }}
          />
        </div>

        {/* Send Button */}
        <button
          onClick={sendRecording}
          className="p-2 bg-dash-accent-green hover:bg-dash-accent-green rounded-full transition-colors"
        >
          <PaperAirplaneIcon className="w-5 h-5 text-white -rotate-45" />
        </button>
      </div>
    )
  }

  // Initial state - Microphone button
  return (
    <button
      onClick={startRecording}
      className="p-2 text-[var(--dash-text-muted)] hover:text-dash-accent-green transition-colors"
      title="تسجيل رسالة صوتية"
    >
      <MicrophoneIcon className="w-6 h-6" />
    </button>
  )
}
