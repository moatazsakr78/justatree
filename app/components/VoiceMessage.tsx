'use client'

import { useState, useRef, useEffect } from 'react'
import { PlayIcon, PauseIcon } from '@heroicons/react/24/solid'

interface VoiceMessageProps {
  audioUrl: string
  isOutgoing?: boolean
  profilePicture?: string | null
  senderName?: string
}

export default function VoiceMessage({
  audioUrl,
  isOutgoing = false,
  profilePicture,
  senderName
}: VoiceMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      setIsLoaded(true)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
      audio.currentTime = 0
    }

    const handleCanPlay = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration)
        setIsLoaded(true)
      }
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('canplay', handleCanPlay)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('canplay', handleCanPlay)
    }
  }, [])

  // Toggle play/pause
  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  // Handle progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !duration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    audio.currentTime = percentage * duration
    setCurrentTime(audio.currentTime)
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  // Generate waveform bars (visual representation)
  const waveformBars = Array.from({ length: 30 }, (_, i) => {
    // Create a pseudo-random but consistent pattern based on index
    const seed = (i * 7 + 3) % 10
    const baseHeight = 20 + seed * 6
    // Animate bars near the current playback position
    const barPosition = (i / 30) * 100
    const isActive = barPosition <= progress
    return { height: baseHeight, isActive }
  })

  return (
    <div className={`flex items-center gap-2 ${isOutgoing ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Profile Picture */}
      {!isOutgoing && (
        <div className="flex-shrink-0">
          {profilePicture ? (
            <img
              src={profilePicture}
              alt={senderName || 'Profile'}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[var(--dash-bg-highlight)] flex items-center justify-center">
              <svg className="w-6 h-6 text-[var(--dash-text-secondary)]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Voice Message Bubble */}
      <div
        className={`flex items-center gap-3 px-3 py-2 rounded-2xl min-w-[200px] max-w-[280px] ${
          isOutgoing
            ? 'bg-dash-accent-green rounded-tr-sm'
            : 'bg-[var(--dash-bg-overlay)] rounded-tl-sm'
        }`}
      >
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            isOutgoing
              ? 'bg-green-700 hover:bg-green-800'
              : 'bg-[var(--dash-bg-highlight)] hover:bg-[var(--dash-bg-overlay)]'
          }`}
        >
          {isPlaying ? (
            <PauseIcon className="w-5 h-5 text-white" />
          ) : (
            <PlayIcon className="w-5 h-5 text-white ml-0.5" />
          )}
        </button>

        {/* Waveform and Progress */}
        <div className="flex-1 flex flex-col gap-1">
          {/* Waveform */}
          <div
            className="flex items-center gap-[2px] h-8 cursor-pointer"
            onClick={handleProgressClick}
          >
            {waveformBars.map((bar, i) => (
              <div
                key={i}
                className={`w-[3px] rounded-full transition-all duration-150 ${
                  bar.isActive
                    ? isOutgoing ? 'bg-white' : 'bg-green-400'
                    : isOutgoing ? 'bg-green-400/50' : 'bg-[var(--dash-text-muted)]'
                }`}
                style={{ height: `${bar.height}%` }}
              />
            ))}
          </div>

          {/* Duration */}
          <div className="flex justify-between text-xs">
            <span className={isOutgoing ? 'text-green-200' : 'text-[var(--dash-text-secondary)]'}>
              {formatTime(isPlaying || currentTime > 0 ? currentTime : duration)}
            </span>
          </div>
        </div>

        {/* Microphone Icon for outgoing */}
        {isOutgoing && (
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-green-200" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93V7h2v1c0 2.76 2.24 5 5 5s5-2.24 5-5V7h2v1c0 4.08-3.06 7.44-7 7.93V18h3v2H9v-2h3v-2.07z"/>
            </svg>
          </div>
        )}
      </div>

      {/* Hidden Audio Element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
    </div>
  )
}
