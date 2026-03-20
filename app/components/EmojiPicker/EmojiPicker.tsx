'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { Theme, Categories, EmojiStyle } from 'emoji-picker-react'
import type { EmojiClickData } from 'emoji-picker-react'

// Lazy load emoji picker for better performance
const Picker = dynamic(
  () => import('emoji-picker-react'),
  {
    ssr: false,
    loading: () => (
      <div className="w-[350px] max-md:w-[calc(100vw-2rem)] h-[400px] max-md:h-[350px] bg-[var(--dash-bg-surface)] rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-[var(--dash-text-muted)]">جاري التحميل...</span>
      </div>
    )
  }
)

interface EmojiPickerProps {
  isOpen: boolean
  onClose: () => void
  onEmojiSelect: (emoji: string) => void
}

export default function EmojiPicker({ isOpen, onClose, onEmojiSelect }: EmojiPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Check screen size for responsive design
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      // Small delay to prevent immediate close on button click
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 100)
      return () => {
        clearTimeout(timeoutId)
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen, onClose])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji)
  }

  return (
    <div
      ref={pickerRef}
      className={`absolute bottom-12 z-50 shadow-[var(--dash-shadow-lg)] rounded-lg overflow-hidden ${
        isMobile ? 'right-[-40px] left-[-40px]' : 'right-0'
      }`}
    >
      <Picker
        onEmojiClick={handleEmojiClick}
        theme={Theme.DARK}
        emojiStyle={EmojiStyle.APPLE}
        searchPlaceholder="بحث عن emoji..."
        width={isMobile ? window.innerWidth - 32 : 350}
        height={isMobile ? 350 : 400}
        previewConfig={{
          showPreview: false
        }}
        skinTonesDisabled={false}
        lazyLoadEmojis={true}
        categories={[
          {
            name: 'الأخيرة',
            category: Categories.SUGGESTED
          },
          {
            name: 'وجوه ومشاعر',
            category: Categories.SMILEYS_PEOPLE
          },
          {
            name: 'حيوانات وطبيعة',
            category: Categories.ANIMALS_NATURE
          },
          {
            name: 'طعام وشراب',
            category: Categories.FOOD_DRINK
          },
          {
            name: 'سفر وأماكن',
            category: Categories.TRAVEL_PLACES
          },
          {
            name: 'أنشطة',
            category: Categories.ACTIVITIES
          },
          {
            name: 'أشياء',
            category: Categories.OBJECTS
          },
          {
            name: 'رموز',
            category: Categories.SYMBOLS
          },
          {
            name: 'أعلام',
            category: Categories.FLAGS
          }
        ]}
      />
    </div>
  )
}
