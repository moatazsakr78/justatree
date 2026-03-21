'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Sidebar from '../../components/layout/Sidebar'
import TopHeader from '../../components/layout/TopHeader'
import VoiceMessage from '../../components/VoiceMessage'
import VoiceRecorder from '../../components/VoiceRecorder'
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  PaperClipIcon,
  PhotoIcon,
  VideoCameraIcon,
  DocumentIcon,
  MapPinIcon,
  XMarkIcon,
  SignalIcon,
  SignalSlashIcon,
  ArrowRightIcon,
  ArrowUturnLeftIcon,
  FaceSmileIcon,
} from '@heroicons/react/24/outline'
import { EmojiPicker } from '../../components/EmojiPicker'
import { getSupabase } from '@/app/lib/supabase/client'

// Message Status Types
type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

interface Message {
  id: string
  message_id: string
  msg_id?: number | string // WasenderAPI integer ID or WhatsApp string ID for replyTo
  from_number: string
  customer_name: string
  message_text: string
  message_type: 'incoming' | 'outgoing'
  media_type?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact'
  media_url?: string
  created_at: string
  is_read?: boolean
  // للرد على الرسائل
  quoted_message_id?: string
  quoted_message_text?: string
  quoted_message_sender?: string
  // للـ reactions
  reactions?: {
    emoji: string
    from_number: string
    is_from_me: boolean
  }[]
  // حالة الرسالة للـ optimistic updates
  status?: MessageStatus
  tempId?: string // ID مؤقت للرسائل قبل الإرسال
}

interface Conversation {
  phoneNumber: string
  customerName: string
  lastMessage: string
  lastMessageTime: string
  lastSender: 'customer' | 'me'
  unreadCount: number
  profilePictureUrl?: string
}

interface WhatsAppContact {
  id: string
  phone_number: string
  customer_name: string | null
  profile_picture_url: string | null
  last_picture_fetch: string | null
}

type AttachmentType = 'image' | 'video' | 'document' | 'location' | null

// ============================================
// دالة موحدة لتنظيف أرقام الهواتف
// تستخدم في جميع أنحاء الملف للمقارنة الصحيحة
// ============================================
const cleanPhoneNumber = (phone: string): string => {
  if (!phone) return ''
  // إزالة كل شيء ما عدا الأرقام
  let cleaned = phone.replace(/[^\d]/g, '')
  // تحويل 0 في البداية لـ 20 (كود مصر)
  if (cleaned.startsWith('0')) {
    cleaned = '20' + cleaned.substring(1)
  }
  return cleaned
}

// MessageStatusIcon Component - عرض حالة الرسالة
function MessageStatusIcon({ status }: { status?: MessageStatus }) {
  if (!status) {
    // للرسائل القديمة بدون status
    return <CheckCircleIcon className="h-3 w-3 opacity-70" />
  }

  switch (status) {
    case 'sending':
      return (
        <ClockIcon className="h-3 w-3 opacity-70 animate-pulse" />
      )
    case 'sent':
      return (
        <svg className="h-3 w-3 opacity-70" viewBox="0 0 16 16" fill="currentColor">
          <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
        </svg>
      )
    case 'delivered':
      return (
        <svg className="h-3.5 w-3.5 opacity-70" viewBox="0 0 20 16" fill="currentColor">
          <path d="M8.78 4.22a.75.75 0 010 1.06l-5.25 5.25a.75.75 0 01-1.06-1.06L7.19 4.75l.03-.03a.75.75 0 011.06 0l.5.5z"/>
          <path d="M14.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L4.22 10.28a.75.75 0 111.06-1.06L7 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
        </svg>
      )
    case 'read':
      return (
        <svg className="h-3.5 w-3.5 text-dash-accent-blue" viewBox="0 0 20 16" fill="currentColor">
          <path d="M8.78 4.22a.75.75 0 010 1.06l-5.25 5.25a.75.75 0 01-1.06-1.06L7.19 4.75l.03-.03a.75.75 0 011.06 0l.5.5z"/>
          <path d="M14.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L4.22 10.28a.75.75 0 111.06-1.06L7 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
        </svg>
      )
    case 'failed':
      return (
        <ExclamationCircleIcon className="h-3.5 w-3.5 text-dash-accent-red" />
      )
    default:
      return <CheckCircleIcon className="h-3 w-3 opacity-70" />
  }
}

// MessageBubble Component with swipe and context menu support
interface MessageBubbleProps {
  msg: Message
  onReply: (msg: Message) => void
  onRetry?: (msg: Message) => void
  onContextMenu: (e: React.MouseEvent, msg: Message) => void
  renderMessageContent: (msg: Message) => React.ReactNode
  formatTime: (timestamp: string) => string
}

function MessageBubble({ msg, onReply, onRetry, onContextMenu, renderMessageContent, formatTime }: MessageBubbleProps) {
  const [touchStart, setTouchStart] = useState(0)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
    setIsSwiping(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return
    const diff = touchStart - e.touches[0].clientX
    // Only allow swipe left (positive diff)
    if (diff > 0) {
      setSwipeOffset(Math.min(diff, 80))
    }
  }

  const handleTouchEnd = () => {
    if (swipeOffset > 50) {
      onReply(msg)
    }
    setSwipeOffset(0)
    setIsSwiping(false)
  }

  return (
    <div
      className={`flex ${msg.message_type === 'outgoing' ? 'justify-start' : 'justify-end'} relative group`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Reply indicator on swipe */}
      <div
        className={`absolute ${msg.message_type === 'outgoing' ? 'left-0' : 'right-0'} top-1/2 -translate-y-1/2 transition-opacity duration-200`}
        style={{
          opacity: swipeOffset > 20 ? Math.min(swipeOffset / 60, 1) : 0,
          transform: `translateY(-50%) translateX(${msg.message_type === 'outgoing' ? -40 : 40}px)`
        }}
      >
        <div className="bg-green-600 rounded-full p-2">
          <ArrowUturnLeftIcon className="h-4 w-4 text-[var(--dash-text-primary)]" />
        </div>
      </div>

      <div
        className={`max-w-[85%] md:max-w-[70%] rounded-lg px-3 md:px-4 py-2 cursor-pointer select-none ${
          msg.message_type === 'outgoing'
            ? 'bg-green-600 text-[var(--dash-text-primary)] rounded-bl-none'
            : 'bg-[var(--dash-bg-raised)] text-[var(--dash-text-primary)] rounded-br-none'
        }`}
        style={{
          wordBreak: 'break-word',
          transform: `translateX(${msg.message_type === 'outgoing' ? -swipeOffset : swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out'
        }}
        onContextMenu={(e) => onContextMenu(e, msg)}
      >
        {/* Quoted message preview */}
        {msg.quoted_message_text && (
          <div className={`rounded px-2 py-1 mb-2 border-r-2 ${
            msg.message_type === 'outgoing'
              ? 'bg-green-700/50 border-white/50'
              : 'bg-black/20 border-green-500'
          }`}>
            <p className={`text-xs font-medium ${
              msg.message_type === 'outgoing' ? 'text-[var(--dash-text-primary)]/80' : 'text-dash-accent-green'
            }`}>
              {msg.quoted_message_sender}
            </p>
            <p className="text-xs text-[var(--dash-text-secondary)] truncate">{msg.quoted_message_text}</p>
          </div>
        )}
        {renderMessageContent(msg)}

        {/* Reactions Display */}
        {msg.reactions && msg.reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${
            msg.message_type === 'outgoing' ? 'justify-start' : 'justify-end'
          }`}>
            {Object.entries(
              msg.reactions.reduce((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([emoji, count]) => (
              <span
                key={emoji}
                className="bg-black/30 rounded-full px-1.5 py-0.5 text-xs flex items-center gap-0.5"
                title={msg.reactions?.filter(r => r.emoji === emoji).map(r => r.from_number).join(', ')}
              >
                <span>{emoji}</span>
                {count > 1 && <span className="text-[var(--dash-text-secondary)] text-[10px]">{count}</span>}
              </span>
            ))}
          </div>
        )}

        <div className={`flex items-center gap-1 mt-1 ${
          msg.message_type === 'outgoing' ? 'justify-start' : 'justify-end'
        }`}>
          <span className="text-xs opacity-70">
            {formatTime(msg.created_at)}
          </span>
          {msg.message_type === 'outgoing' && (
            <MessageStatusIcon status={msg.status} />
          )}
        </div>

        {/* زر إعادة المحاولة للرسائل الفاشلة */}
        {msg.status === 'failed' && onRetry && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRetry(msg)
            }}
            className="flex items-center gap-1 mt-2 text-xs text-dash-accent-red hover:text-dash-accent-red transition-colors"
          >
            <ArrowPathIcon className="h-3 w-3" />
            <span>إعادة المحاولة</span>
          </button>
        )}
      </div>

      {/* Hover reply button for desktop */}
      <button
        onClick={() => onReply(msg)}
        className={`hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity absolute top-1/2 -translate-y-1/2 ${
          msg.message_type === 'outgoing' ? '-left-8' : '-right-8'
        } p-1.5 bg-[var(--dash-bg-overlay)] hover:bg-[var(--dash-bg-highlight)] rounded-full`}
        title="رد"
      >
        <ArrowUturnLeftIcon className="h-3.5 w-3.5 text-[var(--dash-text-primary)]" />
      </button>
    </div>
  )
}

export default function WhatsAppPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [contacts, setContacts] = useState<WhatsAppContact[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const selectedConversationRef = useRef<string | null>(null)
  const contactsRef = useRef<WhatsAppContact[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking')
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSyncingMessages, setIsSyncingMessages] = useState(false)
  const [syncResult, setSyncResult] = useState<{ synced: number; message: string } | null>(null)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [showMobileChat, setShowMobileChat] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true)
  const prevMessageCountRef = useRef<number>(0)

  // Reply state
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg: Message } | null>(null)

  // Attachment state
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [attachmentType, setAttachmentType] = useState<AttachmentType>(null)
  const [mediaUrl, setMediaUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [filename, setFilename] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [locationName, setLocationName] = useState('')

  // File picker state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Location state
  const [isGettingLocation, setIsGettingLocation] = useState(false)

  // File input refs
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)

  // Keep selectedConversationRef in sync with selectedConversation
  useEffect(() => {
    selectedConversationRef.current = selectedConversation
  }, [selectedConversation])

  // Keep contactsRef in sync with contacts
  useEffect(() => {
    contactsRef.current = contacts
  }, [contacts])

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  // دالة للرجوع للقائمة على الموبايل
  const handleBackToList = () => {
    setShowMobileChat(false)
  }

  // دالة لاختيار المحادثة
  const handleSelectConversation = async (phoneNumber: string, unreadCount: number) => {
    setSelectedConversation(phoneNumber)
    setShowMobileChat(true) // إظهار الدردشة على الموبايل

    // Fetch messages for this conversation (lazy loading)
    await fetchConversationMessages(phoneNumber)

    if (unreadCount > 0) {
      markConversationAsRead(phoneNumber)
    }
  }

  // Check connection status
  const checkConnectionStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/whatsapp/send')
      const data = await response.json()
      setConnectionStatus(data.connected ? 'connected' : 'disconnected')
    } catch {
      setConnectionStatus('disconnected')
    }
  }, [])

  // Fetch conversations list only (not all messages - for performance)
  const fetchConversations = useCallback(async () => {
    try {
      setError(null)

      // Fetch conversations and contacts in parallel
      const [messagesRes, contactsRes] = await Promise.all([
        fetch('/api/whatsapp/messages?conversationsOnly=true'),
        fetch('/api/whatsapp/contacts')
      ])

      const messagesData = await messagesRes.json()
      const contactsData = await contactsRes.json()

      console.log('📱 Loaded conversations:', messagesData.conversations?.length || 0)

      setContacts(contactsData || [])

      // Merge profile pictures into conversations (باستخدام الأرقام المنظفة)
      const conversationsWithPictures = (messagesData.conversations || []).map((conv: Conversation) => {
        const cleanedConvPhone = cleanPhoneNumber(conv.phoneNumber)
        const contact = (contactsData || []).find(
          (c: WhatsAppContact) => cleanPhoneNumber(c.phone_number) === cleanedConvPhone
        )
        return {
          ...conv,
          profilePictureUrl: contact?.profile_picture_url || null
        }
      })
      setConversations(conversationsWithPictures)
    } catch (err) {
      console.error('Error fetching conversations:', err)
      setError('فشل في تحميل المحادثات')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Ref for fetchConversations to use in Realtime subscription callback
  const fetchConversationsRef = useRef(fetchConversations)
  useEffect(() => {
    fetchConversationsRef.current = fetchConversations
  }, [fetchConversations])

  // Fetch messages for a specific conversation (lazy loading)
  const fetchConversationMessages = useCallback(async (phoneNumber: string) => {
    try {
      console.log('📨 Loading messages for:', phoneNumber)
      const response = await fetch(`/api/whatsapp/messages?phone=${encodeURIComponent(phoneNumber)}`)
      const data = await response.json()

      console.log('📨 Loaded messages:', data.messages?.length || 0)

      // Update messages for this conversation
      setMessages(prevMessages => {
        // Remove old messages for this conversation and add new ones
        // Use cleanPhoneNumber to ensure consistent comparison
        const otherMessages = prevMessages.filter(m =>
          cleanPhoneNumber(m.from_number) !== cleanPhoneNumber(phoneNumber)
        )
        return [...otherMessages, ...(data.messages || [])]
      })
    } catch (err) {
      console.error('Error fetching conversation messages:', err)
    }
  }, [])

  // Sync contacts and fetch profile pictures
  const syncContacts = useCallback(async () => {
    try {
      setIsSyncing(true)
      const response = await fetch('/api/whatsapp/sync-contacts', { method: 'POST' })
      const data = await response.json()

      if (data.success) {
        console.log('✅ Contacts synced:', data.results)
        // Refresh conversations to get updated profile pictures
        await fetchConversations()
      } else {
        console.error('❌ Sync failed:', data.error)
      }
    } catch (err) {
      console.error('❌ Error syncing contacts:', err)
    } finally {
      setIsSyncing(false)
    }
  }, [fetchConversations])

  // Background sync function (silent - no UI updates except for new messages)
  const syncMessagesInBackground = useCallback(async (phoneNumber: string) => {
    try {
      const response = await fetch(`/api/whatsapp/sync?phone=${encodeURIComponent(phoneNumber)}&limit=50`)
      const data = await response.json()

      if (data.success && data.synced > 0) {
        console.log(`🔄 Background sync: ${data.synced} new messages for ${phoneNumber}`)
        // Only refresh if new messages were synced
        await fetchConversationMessages(phoneNumber)
        fetchConversationsRef.current()
      }
    } catch (error) {
      // Silent - no error shown to user for background sync
      console.error('🔄 Background sync error:', error)
    }
  }, [fetchConversationMessages])

  // Sync messages from WasenderAPI message logs (for missed outgoing messages)
  const syncMessages = useCallback(async () => {
    try {
      setIsSyncingMessages(true)
      setSyncResult(null)
      setError(null)

      // Build URL with optional phone filter
      let url = '/api/whatsapp/sync?limit=200'
      if (selectedConversation) {
        url += `&phone=${encodeURIComponent(selectedConversation)}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        console.log('✅ Messages synced:', data)
        setSyncResult({ synced: data.synced, message: data.message })

        // Refresh conversations and messages
        await fetchConversations()
        if (selectedConversation) {
          await fetchConversationMessages(selectedConversation)
        }

        // Clear sync result after 5 seconds
        setTimeout(() => setSyncResult(null), 5000)
      } else {
        console.error('❌ Sync failed:', data.error)
        setError(data.error || 'فشل في مزامنة الرسائل')
      }
    } catch (err) {
      console.error('❌ Error syncing messages:', err)
      setError('فشل في مزامنة الرسائل')
    } finally {
      setIsSyncingMessages(false)
    }
  }, [selectedConversation, fetchConversations, fetchConversationMessages])

  // Mark messages as read when conversation is opened
  const markConversationAsRead = useCallback(async (phoneNumber: string) => {
    try {
      await fetch('/api/whatsapp/mark-as-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      })

      // Update local state immediately for better UX
      setConversations(prev => prev.map(conv =>
        conv.phoneNumber === phoneNumber
          ? { ...conv, unreadCount: 0 }
          : conv
      ))
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    // Clear any accumulated channels on page load to prevent ChannelRateLimitReached
    const supabase = getSupabase()
    supabase.removeAllChannels()

    fetchConversations()
    checkConnectionStatus()

    // ✅ تم إزالة polling المحادثات - الـ Realtime كافي لتحديث قائمة المحادثات
    // الـ Realtime يتعامل مع: postgres_changes, broadcast: incoming_message, broadcast: new_message

    // Check connection status every 30 seconds
    const statusInterval = setInterval(checkConnectionStatus, 30000)

    return () => {
      clearInterval(statusInterval)
    }
  }, [fetchConversations, checkConnectionStatus])

  // Background sync for outgoing messages sent from mobile WhatsApp
  // Runs every 15 seconds when a conversation is selected
  useEffect(() => {
    if (!selectedConversation) return

    // Initial sync when conversation is selected
    syncMessagesInBackground(selectedConversation)

    // Set up interval for background sync
    const syncInterval = setInterval(() => {
      if (selectedConversationRef.current) {
        syncMessagesInBackground(selectedConversationRef.current)
      }
    }, 5000) // Every 5 seconds - faster sync for outgoing message status updates

    return () => {
      clearInterval(syncInterval)
    }
  }, [selectedConversation, syncMessagesInBackground])

  // Single global Supabase Realtime channel for all WhatsApp messages
  // This prevents ChannelRateLimitReached by using ONE channel instead of per-conversation
  useEffect(() => {
    const supabase = getSupabase()

    // Create ONE channel for all WhatsApp messages (postgres_changes + broadcast)
    const channel = supabase
      .channel('whatsapp_global', {
        config: { broadcast: { self: false } }
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'elfaroukgroup',
          table: 'whatsapp_messages'
        },
        (payload) => {
          console.log('📩 Realtime: New message received', payload)
          const newMsg = payload.new as Message

          // تنظيف رقم الهاتف للمقارنة الصحيحة
          const cleanedFromNumber = cleanPhoneNumber(newMsg.from_number)
          const cleanedSelectedNumber = selectedConversationRef.current
            ? cleanPhoneNumber(selectedConversationRef.current)
            : null

          console.log('📩 postgres_changes phone comparison:', {
            incoming: newMsg.from_number,
            incomingCleaned: cleanedFromNumber,
            selected: selectedConversationRef.current,
            selectedCleaned: cleanedSelectedNumber,
            match: cleanedSelectedNumber === cleanedFromNumber
          })

          // Update messages if it's for the currently selected conversation
          if (cleanedSelectedNumber && cleanedSelectedNumber === cleanedFromNumber) {
            setMessages(prev => {
              const exists = prev.some(m => m.message_id === newMsg.message_id)
              if (exists) return prev

              // For outgoing messages: check if there's a pending optimistic message
              // that this realtime event corresponds to (prevents duplicate display)
              // Match by msg_id (most reliable) or by text+phone (fallback)
              // Don't require status === 'sending' because API response may have already changed it to 'sent'
              if (newMsg.message_type === 'outgoing') {
                const optimisticIdx = prev.findIndex(m =>
                  m.tempId &&
                  m.message_type === 'outgoing' &&
                  cleanPhoneNumber(m.from_number) === cleanPhoneNumber(newMsg.from_number) &&
                  (m.message_text === newMsg.message_text || (m.msg_id && newMsg.msg_id && m.msg_id === newMsg.msg_id))
                )
                if (optimisticIdx >= 0) {
                  const updated = [...prev]
                  updated[optimisticIdx] = {
                    ...newMsg,
                    tempId: undefined,
                    status: 'sent' as MessageStatus,
                  }
                  return updated
                }
              }

              return [...prev, newMsg]
            })
          }

          // Update conversations list for ALL messages (incoming + outgoing)
          // This ensures the conversation list is always up-to-date
          const isIncoming = newMsg.message_type === 'incoming'
          setConversations(prev => {
            const updated = [...prev]
            const convIndex = updated.findIndex(c => cleanPhoneNumber(c.phoneNumber) === cleanedFromNumber)
            if (convIndex >= 0) {
              // محادثة موجودة - تحديثها
              const isConversationOpen = cleanedSelectedNumber === cleanedFromNumber
              updated[convIndex] = {
                ...updated[convIndex],
                lastMessage: newMsg.message_text,
                lastMessageTime: newMsg.created_at,
                lastSender: isIncoming ? 'customer' : 'me',
                unreadCount: (isIncoming && !isConversationOpen)
                  ? updated[convIndex].unreadCount + 1
                  : updated[convIndex].unreadCount
              }
              // Move to top
              const [conv] = updated.splice(convIndex, 1)
              updated.unshift(conv)
            } else if (isIncoming) {
              // ✨ محادثة جديدة - إضافتها فوراً (للرسائل الواردة فقط)
              // البحث عن صورة البروفايل من الـ contacts
              const contact = contactsRef.current.find(
                c => cleanPhoneNumber(c.phone_number) === cleanedFromNumber
              )
              updated.unshift({
                phoneNumber: cleanedFromNumber,
                customerName: newMsg.customer_name || cleanedFromNumber,
                lastMessage: newMsg.message_text,
                lastMessageTime: newMsg.created_at,
                lastSender: 'customer',
                unreadCount: 1,
                profilePictureUrl: contact?.profile_picture_url || undefined
              })
            }
            return updated
          })
        }
      )
      .on('broadcast', { event: 'new_message' }, (payload) => {
        // Handle cross-device sync for outgoing messages
        console.log('📡 Broadcast: Outgoing message sync', payload)
        const newMsg = payload.payload as Message
        const cleanedMsgNumber = cleanPhoneNumber(newMsg.from_number)
        const cleanedSelectedNumber = selectedConversationRef.current
          ? cleanPhoneNumber(selectedConversationRef.current)
          : null
        if (cleanedSelectedNumber && cleanedSelectedNumber === cleanedMsgNumber) {
          setMessages(prev => {
            const exists = prev.some(m => m.message_id === newMsg.message_id)
            if (exists) return prev

            // For outgoing messages: check if there's a pending optimistic message
            // that this broadcast event corresponds to (prevents duplicate display)
            if (newMsg.message_type === 'outgoing') {
              const optimisticIdx = prev.findIndex(m =>
                m.tempId &&
                m.message_type === 'outgoing' &&
                cleanPhoneNumber(m.from_number) === cleanPhoneNumber(newMsg.from_number) &&
                (m.message_text === newMsg.message_text || (m.msg_id && newMsg.msg_id && m.msg_id === newMsg.msg_id))
              )
              if (optimisticIdx >= 0) {
                const updated = [...prev]
                updated[optimisticIdx] = {
                  ...newMsg,
                  tempId: undefined,
                  status: 'sent' as MessageStatus,
                }
                return updated
              }
            }

            return [...prev, newMsg]
          })
        }

        // تحديث قائمة المحادثات ونقلها للأعلى (مثل الواتساب الحقيقي)
        setConversations(prev => {
          const updated = [...prev]
          const convIndex = updated.findIndex(c =>
            cleanPhoneNumber(c.phoneNumber) === cleanedMsgNumber
          )
          if (convIndex >= 0) {
            // محادثة موجودة - تحديثها
            updated[convIndex] = {
              ...updated[convIndex],
              lastMessage: newMsg.message_text,
              lastMessageTime: newMsg.created_at,
              lastSender: 'me' as const
            }
            // نقل المحادثة للأعلى
            const [conv] = updated.splice(convIndex, 1)
            updated.unshift(conv)
          }
          return updated
        })
      })
      .on('broadcast', { event: 'incoming_message' }, (payload) => {
        // ============================================
        // Handle incoming messages from webhook
        // ============================================
        console.log('📩 Broadcast: Incoming message received!', payload)
        const newMsg = payload.payload as Message

        // استخدام الدالة المشتركة لتنظيف أرقام الهواتف
        const incomingNumber = cleanPhoneNumber(newMsg.from_number)
        const selectedNumber = selectedConversationRef.current
          ? cleanPhoneNumber(selectedConversationRef.current)
          : null

        console.log('📩 Phone comparison:', {
          incoming: newMsg.from_number,
          incomingCleaned: incomingNumber,
          selected: selectedConversationRef.current,
          selectedCleaned: selectedNumber,
          match: selectedNumber === incomingNumber
        })

        // إضافة الرسالة للـ state إذا كانت للمحادثة المفتوحة (باستخدام الرقم المنظف)
        if (selectedNumber && selectedNumber === incomingNumber) {
          setMessages(prev => {
            const exists = prev.some(m => m.message_id === newMsg.message_id)
            if (exists) return prev
            console.log('📩 Adding incoming message to conversation')
            return [...prev, newMsg]
          })
        }

        // تحديث قائمة المحادثات دائماً (باستخدام الرقم المنظف للمقارنة)
        setConversations(prev => {
          const updated = [...prev]
          const convIndex = updated.findIndex(c => cleanPhoneNumber(c.phoneNumber) === incomingNumber)
          if (convIndex >= 0) {
            // محادثة موجودة - تحديثها
            const isConversationOpen = selectedNumber === incomingNumber
            updated[convIndex] = {
              ...updated[convIndex],
              lastMessage: newMsg.message_text,
              lastMessageTime: newMsg.created_at,
              lastSender: 'customer',
              // زيادة عداد الرسائل غير المقروءة إذا لم تكن المحادثة مفتوحة
              unreadCount: !isConversationOpen
                ? updated[convIndex].unreadCount + 1
                : updated[convIndex].unreadCount
            }
            // نقل المحادثة للأعلى
            const [conv] = updated.splice(convIndex, 1)
            updated.unshift(conv)
          } else {
            // محادثة جديدة - إضافتها باستخدام الرقم المنظف للاتساق
            // البحث عن صورة البروفايل من الـ contacts
            const contact = contactsRef.current.find(
              c => cleanPhoneNumber(c.phone_number) === incomingNumber
            )
            updated.unshift({
              phoneNumber: incomingNumber,
              customerName: newMsg.customer_name,
              lastMessage: newMsg.message_text,
              lastMessageTime: newMsg.created_at,
              lastSender: 'customer',
              unreadCount: 1,
              profilePictureUrl: contact?.profile_picture_url || undefined
            })
          }
          return updated
        })
      })
      .on('broadcast', { event: 'profile_picture_updated' }, (payload) => {
        // ============================================
        // Handle profile picture updates from webhook
        // ============================================
        console.log('📷 Broadcast: Profile picture updated', payload)
        const { phone_number, profile_picture_url } = payload.payload as {
          phone_number: string
          profile_picture_url: string | null
        }

        if (!phone_number || !profile_picture_url) return

        // استخدام الدالة المشتركة لتنظيف أرقام الهواتف
        const cleanedNumber = cleanPhoneNumber(phone_number)

        // Update the conversation's profile picture
        setConversations(prev => prev.map(conv => {
          if (cleanPhoneNumber(conv.phoneNumber) === cleanedNumber) {
            return { ...conv, profilePictureUrl: profile_picture_url }
          }
          return conv
        }))

        // Update contacts state
        setContacts(prev => prev.map(contact => {
          if (cleanPhoneNumber(contact.phone_number) === cleanedNumber) {
            return { ...contact, profile_picture_url }
          }
          return contact
        }))
      })
      .subscribe((status, err) => {
        console.log('📡 Global Realtime subscription status:', status)

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error('❌ Realtime connection failed:', err)
          // Fetch conversations immediately as fallback
          fetchConversationsRef.current()
        }

        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime connected successfully')
        }
      })

    return () => {
      console.log('📡 Cleaning up global Realtime subscription')
      supabase.removeChannel(channel)
    }
  }, []) // Empty deps - channel created ONCE on mount

  // ============================================
  // Fallback Polling: تحديث الرسائل كل 30 ثانية فقط
  // الـ Realtime يتعامل مع التحديثات الفورية
  // هذا fallback فقط في حالة فشل الـ Realtime
  // ============================================
  useEffect(() => {
    const pollInterval = setInterval(() => {
      // لا نستدعي fetchConversations() لأن الـ optimistic update كافي
      // والاستدعاء المتكرر يكتب فوق ترتيب المحادثات المحدث
      if (selectedConversation) {
        console.log('🔄 Fallback polling for messages (every 30s)...')
        fetchConversationMessages(selectedConversation)
      }
    }, 30000) // ✅ كل 30 ثانية بدلاً من 5 ثواني - fallback فقط

    return () => {
      clearInterval(pollInterval)
    }
  }, [selectedConversation, fetchConversationMessages])

  // Scroll to bottom only when needed (new messages or conversation change)
  useEffect(() => {
    // Use cleanPhoneNumber to ensure consistent comparison
    const currentMessageCount = messages.filter(m =>
      cleanPhoneNumber(m.from_number) === cleanPhoneNumber(selectedConversation || '')
    ).length
    const isNewConversation = prevMessageCountRef.current === 0 && currentMessageCount > 0
    const hasNewMessages = currentMessageCount > prevMessageCountRef.current

    // Scroll to bottom only if:
    // 1. User is at bottom (shouldScrollToBottom is true)
    // 2. AND (it's a new conversation OR there are new messages)
    if (shouldScrollToBottom && (isNewConversation || hasNewMessages)) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    prevMessageCountRef.current = currentMessageCount
  }, [messages, selectedConversation, shouldScrollToBottom])

  // Reset scroll state when changing conversations
  useEffect(() => {
    setShouldScrollToBottom(true)
    prevMessageCountRef.current = 0
  }, [selectedConversation])

  // Filter messages for selected conversation
  const conversationMessages = messages.filter(
    msg => cleanPhoneNumber(msg.from_number) === cleanPhoneNumber(selectedConversation || '')
  )

  // Filter conversations by search
  const filteredConversations = conversations.filter(conv =>
    conv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.phoneNumber.includes(searchQuery)
  )

  // Reset attachment state
  const resetAttachment = () => {
    setAttachmentType(null)
    setMediaUrl('')
    setCaption('')
    setFilename('')
    setLatitude('')
    setLongitude('')
    setLocationName('')
    setShowAttachmentMenu(false)
    setSelectedFile(null)
    if (filePreview) {
      URL.revokeObjectURL(filePreview)
    }
    setFilePreview(null)
    setIsUploading(false)
    setIsGettingLocation(false)
    // Reset file inputs
    if (imageInputRef.current) imageInputRef.current.value = ''
    if (videoInputRef.current) videoInputRef.current.value = ''
    if (documentInputRef.current) documentInputRef.current.value = ''
  }

  // Handle getting current location from device
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('المتصفح لا يدعم تحديد الموقع')
      return
    }

    setIsGettingLocation(true)
    setShowAttachmentMenu(false)
    setAttachmentType('location')
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toString())
        setLongitude(position.coords.longitude.toString())
        setIsGettingLocation(false)
      },
      (err) => {
        console.error('Geolocation error:', err)
        let errorMessage = 'فشل في تحديد الموقع'
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'تم رفض الوصول للموقع. يرجى السماح للمتصفح بالوصول للموقع'
            break
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'معلومات الموقع غير متاحة'
            break
          case err.TIMEOUT:
            errorMessage = 'انتهت مهلة طلب الموقع'
            break
        }
        setError(errorMessage)
        setIsGettingLocation(false)
        resetAttachment()
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  // Handle sending location
  const handleSendLocation = async () => {
    if (!selectedConversation || !latitude || !longitude) return

    setIsSending(true)

    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedConversation,
          messageType: 'location',
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          locationName: locationName || undefined
        })
      })

      const data = await response.json()

      if (data.success) {
        resetAttachment()
        if (selectedConversation) await fetchConversationMessages(selectedConversation)
      } else {
        setError(data.error || 'فشل في إرسال الموقع')
      }
    } catch (err) {
      console.error('Error sending location:', err)
      setError('فشل في إرسال الموقع')
    } finally {
      setIsSending(false)
    }
  }

  // Handle file selection from file picker
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'document') => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setAttachmentType(type)
    setFilename(file.name)
    setShowAttachmentMenu(false)

    // Create preview for images and videos
    if (type === 'image' || type === 'video') {
      const previewUrl = URL.createObjectURL(file)
      setFilePreview(previewUrl)
    } else {
      setFilePreview(null)
    }
  }

  // Upload and send media file
  const handleSendMedia = async () => {
    if (!selectedConversation || !selectedFile || !attachmentType) return
    if (attachmentType === 'location') return // Location doesn't use file upload

    setIsUploading(true)
    setIsSending(true)

    try {
      // 1. Upload file to Supabase Storage
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('mediaType', attachmentType)

      const uploadResponse = await fetch('/api/whatsapp/upload-media', {
        method: 'POST',
        body: formData
      })

      const uploadResult = await uploadResponse.json()

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || 'فشل في رفع الملف')
      }

      // 2. Send message via WhatsApp
      const sendResponse = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedConversation,
          messageType: attachmentType,
          mediaUrl: uploadResult.url,
          caption: caption || undefined,
          filename: attachmentType === 'document' ? uploadResult.filename : undefined
        })
      })

      const sendResult = await sendResponse.json()

      if (sendResult.success) {
        resetAttachment()
        setNewMessage('')
        if (selectedConversation) await fetchConversationMessages(selectedConversation)
      } else {
        setError(sendResult.error || 'فشل في إرسال الملف')
      }

    } catch (err) {
      console.error('Error sending media:', err)
      setError('فشل في إرسال الملف')
    } finally {
      setIsUploading(false)
      setIsSending(false)
    }
  }

  // Send voice note
  const sendVoiceNote = async (audioBlob: Blob, duration: number) => {
    if (!selectedConversation) return

    setIsSending(true)
    try {
      // 1. Upload audio to Supabase Storage
      const formData = new FormData()
      formData.append('audio', audioBlob, `voice_${Date.now()}.webm`)

      const uploadResponse = await fetch('/api/whatsapp/upload-audio', {
        method: 'POST',
        body: formData
      })

      const uploadResult = await uploadResponse.json()

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || 'فشل في رفع الملف الصوتي')
      }

      // 2. Send audio message via WhatsApp
      const sendResponse = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedConversation,
          messageType: 'audio',
          mediaUrl: uploadResult.url
        })
      })

      const sendResult = await sendResponse.json()

      if (sendResult.success) {
        // Refresh messages
        if (selectedConversation) await fetchConversationMessages(selectedConversation)
      } else {
        setError(sendResult.error || 'فشل في إرسال الرسالة الصوتية')
      }

    } catch (err) {
      console.error('Error sending voice note:', err)
      setError('فشل في إرسال الرسالة الصوتية')
    } finally {
      setIsSending(false)
      setIsRecordingVoice(false)
    }
  }

  // Send message - True Optimistic Update
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedConversation) return

    // Check if we have something to send
    const hasTextMessage = newMessage.trim()
    const hasAttachment = attachmentType && (mediaUrl || (attachmentType === 'location' && latitude && longitude))

    if (!hasTextMessage && !hasAttachment) return

    // ========================
    // 1. إنشاء tempId وتخزين القيم قبل المسح
    // ========================
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const messageText = attachmentType === 'location'
      ? (locationName || 'موقع')
      : (newMessage || caption || `[${attachmentType === 'image' ? 'صورة' : attachmentType === 'video' ? 'فيديو' : attachmentType === 'document' ? 'مستند' : 'رسالة'}]`)
    const currentMediaUrl = mediaUrl || undefined
    const currentMediaType = attachmentType || 'text'
    const currentReplyingTo = replyingTo

    // ========================
    // 2. إنشاء الرسالة المؤقتة مع status: 'sending'
    // ========================
    const optimisticMessage: Message = {
      id: tempId,
      message_id: tempId,
      tempId: tempId,
      from_number: selectedConversation,
      customer_name: 'أنت',
      message_text: messageText,
      message_type: 'outgoing',
      media_type: currentMediaType,
      media_url: currentMediaUrl,
      created_at: new Date().toISOString(),
      quoted_message_id: currentReplyingTo?.message_id,
      quoted_message_text: currentReplyingTo?.message_text,
      quoted_message_sender: currentReplyingTo ? (currentReplyingTo.message_type === 'outgoing' ? 'أنت' : currentReplyingTo.customer_name) : undefined,
      status: 'sending', // ← حالة الإرسال
    }

    // ========================
    // 3. إضافة الرسالة للـ state فوراً (قبل API call)
    // ========================
    setMessages(prev => [...prev, optimisticMessage])

    // ========================
    // 4. تحديث قائمة المحادثات ونقلها للأعلى فوراً
    // ========================
    setConversations(prev => {
      const updated = [...prev]
      const cleanedSelectedPhone = cleanPhoneNumber(selectedConversation)
      const convIndex = updated.findIndex(c => cleanPhoneNumber(c.phoneNumber) === cleanedSelectedPhone)
      if (convIndex >= 0) {
        updated[convIndex] = {
          ...updated[convIndex],
          lastMessage: messageText,
          lastMessageTime: optimisticMessage.created_at,
          lastSender: 'me' as const
        }
        // نقل للأعلى
        const [conv] = updated.splice(convIndex, 1)
        updated.unshift(conv)
      }
      return updated
    })

    // ========================
    // 5. مسح الـ input فوراً (تجربة مستخدم أفضل)
    // ========================
    setNewMessage('')
    resetAttachment()
    setReplyingTo(null)

    // ========================
    // 6. Force scroll to bottom
    // ========================
    setShouldScrollToBottom(true)
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 50)

    // ========================
    // 7. API call في الخلفية
    // ========================
    try {
      let requestBody: any = {
        to: selectedConversation,
      }

      // Add reply info if replying to a message
      if (currentReplyingTo) {
        const replyId = currentReplyingTo.msg_id || currentReplyingTo.message_id
        if (replyId) {
          requestBody.quotedMsgId = replyId
        }
        requestBody.quotedMessageId = currentReplyingTo.message_id
        requestBody.quotedMessageText = currentReplyingTo.message_text
        requestBody.quotedMessageSender = currentReplyingTo.message_type === 'outgoing' ? 'أنت' : currentReplyingTo.customer_name
      }

      if (attachmentType) {
        requestBody.messageType = attachmentType

        switch (attachmentType) {
          case 'image':
          case 'video':
          case 'document':
            requestBody.mediaUrl = currentMediaUrl
            requestBody.caption = caption || newMessage
            if (attachmentType === 'document') {
              requestBody.filename = filename
            }
            break
          case 'location':
            requestBody.latitude = parseFloat(latitude)
            requestBody.longitude = parseFloat(longitude)
            requestBody.locationName = locationName
            break
        }
      } else {
        requestBody.messageType = 'text'
        requestBody.message = messageText
      }

      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (data.success) {
        // ========================
        // 8. نجاح: تحديث الرسالة من 'sending' إلى 'sent'
        // ========================
        setMessages(prev => prev.map(msg =>
          msg.tempId === tempId
            ? {
                ...msg,
                id: data.messageId || msg.id,
                message_id: data.messageId || msg.message_id,
                msg_id: data.msgId,
                status: 'sent' as MessageStatus,
              }
            : msg
        ))

        // Broadcast to other devices for cross-device sync
        const supabase = getSupabase()
        supabase
          .channel('whatsapp_global')
          .send({
            type: 'broadcast',
            event: 'new_message',
            payload: { ...optimisticMessage, status: 'sent', id: data.messageId, message_id: data.messageId }
          })
          .then(() => {
            console.log('📡 Broadcast sent successfully')
          })
          .catch((err) => {
            console.error('📡 Broadcast failed:', err)
          })
      } else {
        // ========================
        // 9. فشل: تحديث الرسالة من 'sending' إلى 'failed'
        // ========================
        setMessages(prev => prev.map(msg =>
          msg.tempId === tempId
            ? { ...msg, status: 'failed' as MessageStatus }
            : msg
        ))
        setError(data.error || 'فشل في إرسال الرسالة')
      }
    } catch (err) {
      // ========================
      // 10. خطأ: تحديث الرسالة إلى 'failed'
      // ========================
      console.error('Error sending message:', err)
      setMessages(prev => prev.map(msg =>
        msg.tempId === tempId
          ? { ...msg, status: 'failed' as MessageStatus }
          : msg
      ))
      setError('فشل في إرسال الرسالة')
    }
  }

  // Retry failed message
  const handleRetryMessage = useCallback(async (failedMsg: Message) => {
    if (!failedMsg.tempId || failedMsg.status !== 'failed') return

    // تحديث الحالة إلى 'sending' مرة أخرى
    setMessages(prev => prev.map(msg =>
      msg.tempId === failedMsg.tempId
        ? { ...msg, status: 'sending' as MessageStatus }
        : msg
    ))

    try {
      let requestBody: any = {
        to: failedMsg.from_number,
        messageType: failedMsg.media_type || 'text',
      }

      if (failedMsg.media_type === 'text' || !failedMsg.media_type) {
        requestBody.message = failedMsg.message_text
      } else if (failedMsg.media_url) {
        requestBody.mediaUrl = failedMsg.media_url
        requestBody.caption = failedMsg.message_text
      }

      // Add reply info if exists
      if (failedMsg.quoted_message_id) {
        requestBody.quotedMessageId = failedMsg.quoted_message_id
        requestBody.quotedMessageText = failedMsg.quoted_message_text
        requestBody.quotedMessageSender = failedMsg.quoted_message_sender
      }

      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (data.success) {
        // نجاح: تحديث الرسالة
        setMessages(prev => prev.map(msg =>
          msg.tempId === failedMsg.tempId
            ? {
                ...msg,
                id: data.messageId || msg.id,
                message_id: data.messageId || msg.message_id,
                msg_id: data.msgId,
                status: 'sent' as MessageStatus,
              }
            : msg
        ))
      } else {
        // فشل مرة أخرى
        setMessages(prev => prev.map(msg =>
          msg.tempId === failedMsg.tempId
            ? { ...msg, status: 'failed' as MessageStatus }
            : msg
        ))
        setError(data.error || 'فشل في إعادة إرسال الرسالة')
      }
    } catch (err) {
      console.error('Error retrying message:', err)
      setMessages(prev => prev.map(msg =>
        msg.tempId === failedMsg.tempId
          ? { ...msg, status: 'failed' as MessageStatus }
          : msg
      ))
      setError('فشل في إعادة إرسال الرسالة')
    }
  }, [])

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'اليوم'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'أمس'
    }
    return date.toLocaleDateString('ar-EG')
  }

  // Get profile picture for a contact (باستخدام الأرقام المنظفة)
  const getContactProfilePicture = (phoneNumber: string) => {
    const cleanedPhone = cleanPhoneNumber(phoneNumber)
    const contact = conversations.find(c => cleanPhoneNumber(c.phoneNumber) === cleanedPhone)
    return contact?.profilePictureUrl || null
  }

  // Render message content based on type
  const renderMessageContent = (msg: Message, isVoiceNote?: boolean) => {
    const mediaType = msg.media_type || 'text'

    switch (mediaType) {
      case 'image':
        return (
          <div>
            {msg.media_url && (
              <img
                src={msg.media_url}
                alt="صورة"
                className="max-w-[250px] max-h-[300px] object-cover rounded-lg mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(msg.media_url, '_blank')}
              />
            )}
            {msg.message_text && msg.message_text !== '[صورة]' && (
              <p className="text-sm whitespace-pre-wrap">{msg.message_text}</p>
            )}
          </div>
        )

      case 'video':
        return (
          <div>
            {msg.media_url && (
              <video
                src={msg.media_url}
                controls
                className="max-w-[280px] max-h-[350px] rounded-lg mb-2"
              />
            )}
            {msg.message_text && msg.message_text !== '[فيديو]' && (
              <p className="text-sm whitespace-pre-wrap">{msg.message_text}</p>
            )}
          </div>
        )

      case 'audio':
        return (
          <div className="-mx-4 -my-2">
            {msg.media_url && (
              <VoiceMessage
                audioUrl={msg.media_url}
                isOutgoing={msg.message_type === 'outgoing'}
                profilePicture={msg.message_type === 'incoming' ? getContactProfilePicture(msg.from_number) : null}
                senderName={msg.customer_name}
              />
            )}
          </div>
        )

      case 'document':
        return (
          <div className="flex items-center gap-2">
            <DocumentIcon className="h-8 w-8 text-[var(--dash-text-secondary)]" />
            <div>
              <p className="text-sm font-medium">{msg.message_text || 'مستند'}</p>
              {msg.media_url && (
                <a
                  href={msg.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-dash-accent-blue hover:underline"
                >
                  تحميل
                </a>
              )}
            </div>
          </div>
        )

      case 'location':
        return (
          <div className="flex items-center gap-2">
            <MapPinIcon className="h-6 w-6 text-dash-accent-red" />
            <p className="text-sm">{msg.message_text || 'موقع'}</p>
          </div>
        )

      default:
        return <p className="text-sm whitespace-pre-wrap">{msg.message_text}</p>
    }
  }

  return (
    <div className="h-screen bg-[var(--dash-bg-surface)] overflow-hidden overflow-x-hidden">
      {/* Top Header */}
      <TopHeader onMenuClick={toggleSidebar} isMenuOpen={isSidebarOpen} />

      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />

      {/* Main Content Container */}
      <div className="h-full pt-12 overflow-hidden flex flex-col">

        {/* Page Header - رفيع وقابل للتمرير على الموبايل */}
        <div className={`bg-[var(--dash-bg-raised)] border-b border-[var(--dash-border-default)] px-2 md:px-4 py-2 md:py-3 ${showMobileChat ? 'hidden md:block' : ''}`}>
          <div className="flex items-center gap-2 md:gap-3 overflow-x-auto scrollbar-hide">
            <ChatBubbleLeftRightIcon className="h-5 w-5 md:h-6 md:w-6 text-dash-accent-green flex-shrink-0" />
            <h1 className="text-sm md:text-xl font-bold text-[var(--dash-text-primary)] flex-shrink-0 whitespace-nowrap">محادثات واتساب</h1>
            {/* Connection Status */}
            <div className={`flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs flex-shrink-0 ${
              connectionStatus === 'connected'
                ? 'bg-dash-accent-green-subtle text-dash-accent-green'
                : connectionStatus === 'disconnected'
                ? 'bg-dash-accent-red-subtle text-dash-accent-red'
                : 'bg-dash-accent-orange-subtle text-dash-accent-orange'
            }`}>
              {connectionStatus === 'connected' ? (
                <>
                  <SignalIcon className="h-2.5 w-2.5 md:h-3 md:w-3" />
                  <span>متصل</span>
                </>
              ) : connectionStatus === 'disconnected' ? (
                <>
                  <SignalSlashIcon className="h-2.5 w-2.5 md:h-3 md:w-3" />
                  <span className="hidden md:inline">غير متصل</span>
                  <span className="md:hidden">منقطع</span>
                </>
              ) : (
                <>
                  <ArrowPathIcon className="h-2.5 w-2.5 md:h-3 md:w-3 animate-spin" />
                  <span className="hidden md:inline">جاري الفحص</span>
                  <span className="md:hidden">فحص</span>
                </>
              )}
            </div>
            {/* Spacer */}
            <div className="flex-1 min-w-[8px]" />
            {/* Sync Result Notification */}
            {syncResult && syncResult.synced > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-dash-accent-green-subtle text-dash-accent-green rounded-md text-xs flex-shrink-0">
                <CheckCircleIcon className="h-4 w-4" />
                <span>{syncResult.message}</span>
              </div>
            )}
            {/* Buttons */}
            <button
              onClick={syncMessages}
              disabled={isSyncingMessages}
              className="flex items-center gap-1 md:gap-2 px-2 py-1 md:px-3 md:py-2 text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-dash-accent-blue-subtle rounded-md transition-colors disabled:opacity-50 flex-shrink-0"
              title="مزامنة الرسائل من واتساب"
            >
              <ArrowPathIcon className={`h-4 w-4 ${isSyncingMessages ? 'animate-spin' : ''}`} />
              <span className="text-xs md:text-sm whitespace-nowrap">{isSyncingMessages ? 'مزامنة...' : 'مزامنة'}</span>
            </button>
            <button
              onClick={syncContacts}
              disabled={isSyncing}
              className="flex items-center gap-1 md:gap-2 px-2 py-1 md:px-3 md:py-2 text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-dash-accent-green-subtle rounded-md transition-colors disabled:opacity-50 flex-shrink-0"
              title="مزامنة صور العملاء"
            >
              <PhotoIcon className={`h-4 w-4 ${isSyncing ? 'animate-pulse' : ''}`} />
              <span className="text-xs md:text-sm whitespace-nowrap">{isSyncing ? 'مزامنة...' : 'الصور'}</span>
            </button>
            <button
              onClick={async () => {
                await fetchConversations()
                if (selectedConversation) await fetchConversationMessages(selectedConversation)
              }}
              className="flex items-center gap-1 md:gap-2 px-2 py-1 md:px-3 md:py-2 text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]/30 rounded-md transition-colors flex-shrink-0"
            >
              <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="text-xs md:text-sm">تحديث</span>
            </button>
          </div>
        </div>

        {/* Chat Container */}
        <div className="flex-1 flex overflow-hidden">

          {/* Conversations List */}
          <div className={`
            ${showMobileChat ? 'hidden' : 'flex'}
            md:flex
            w-full md:w-80
            bg-[var(--dash-bg-raised)] border-l border-[var(--dash-border-default)] flex-col
          `}>
            {/* Search */}
            <div className="p-3 border-b border-[var(--dash-border-default)]">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--dash-text-muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث في المحادثات..."
                  className="w-full pl-4 pr-10 py-2 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded-md text-[var(--dash-text-primary)] placeholder-[var(--dash-text-disabled)] focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-[var(--dash-text-muted)]">جاري التحميل...</div>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4">
                  <ChatBubbleLeftRightIcon className="h-12 w-12 text-[var(--dash-text-disabled)] mb-3" />
                  <p className="text-[var(--dash-text-muted)] text-sm text-center">
                    لا توجد محادثات بعد
                  </p>
                  <p className="text-[var(--dash-text-disabled)] text-xs text-center mt-1">
                    ستظهر الرسائل هنا عندما يتواصل معك العملاء
                  </p>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <div
                    key={conv.phoneNumber}
                    onClick={() => handleSelectConversation(conv.phoneNumber, conv.unreadCount)}
                    className={`p-3 border-b border-[var(--dash-border-default)]/50 cursor-pointer transition-colors ${
                      selectedConversation && cleanPhoneNumber(selectedConversation) === cleanPhoneNumber(conv.phoneNumber)
                        ? 'bg-green-600/20 border-r-2 border-r-green-500'
                        : 'hover:bg-[var(--dash-bg-overlay)]/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {conv.profilePictureUrl ? (
                        <img
                          src={conv.profilePictureUrl}
                          alt={conv.customerName}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                          onError={(e) => {
                            // Fallback to icon if image fails to load
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            target.nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                      ) : null}
                      <div className={`w-10 h-10 rounded-full bg-[var(--dash-bg-highlight)] flex items-center justify-center flex-shrink-0 ${conv.profilePictureUrl ? 'hidden' : ''}`}>
                        <UserCircleIcon className="h-6 w-6 text-[var(--dash-text-secondary)]" />
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[var(--dash-text-primary)] font-medium text-sm truncate flex-1 min-w-0">
                            {conv.customerName}
                          </span>
                          <span className="text-[var(--dash-text-muted)] text-xs flex-shrink-0">
                            {formatTime(conv.lastMessageTime)}
                          </span>
                        </div>
                        <p className="text-[var(--dash-text-muted)] text-xs truncate mt-1">
                          {conv.lastSender === 'me' && (
                            <span className="text-dash-accent-green ml-1">أنت: </span>
                          )}
                          {conv.lastMessage}
                        </p>
                        <p className="text-[var(--dash-text-disabled)] text-xs mt-1 font-mono truncate">
                          +{conv.phoneNumber}
                        </p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="bg-green-500 text-[var(--dash-text-primary)] text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`
            ${!showMobileChat && !selectedConversation ? 'hidden' : ''}
            ${showMobileChat ? 'flex' : 'hidden'}
            md:flex
            flex-1 flex-col bg-[var(--dash-bg-surface)]
            absolute md:relative inset-0 md:inset-auto
            z-30 md:z-auto
          `}>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="bg-[var(--dash-bg-raised)] px-4 py-3 border-b border-[var(--dash-border-default)] mt-12 md:mt-0">
                  {(() => {
                    const selectedContact = conversations.find(c =>
                      cleanPhoneNumber(c.phoneNumber) === cleanPhoneNumber(selectedConversation || '')
                    )
                    return (
                      <div className="flex items-center gap-3">
                        {/* زر الرجوع - يظهر فقط على الموبايل */}
                        <button
                          onClick={handleBackToList}
                          className="md:hidden p-2 -mr-2 text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]/50 rounded-full transition-colors"
                        >
                          <ArrowRightIcon className="h-5 w-5" />
                        </button>
                        {selectedContact?.profilePictureUrl ? (
                          <img
                            src={selectedContact.profilePictureUrl}
                            alt={selectedContact.customerName}
                            className="w-12 h-12 rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              target.nextElementSibling?.classList.remove('hidden')
                            }}
                          />
                        ) : null}
                        <div className={`w-12 h-12 rounded-full bg-[var(--dash-bg-highlight)] flex items-center justify-center ${selectedContact?.profilePictureUrl ? 'hidden' : ''}`}>
                          <UserCircleIcon className="h-7 w-7 text-[var(--dash-text-secondary)]" />
                        </div>
                        <div>
                          <h3 className="text-[var(--dash-text-primary)] font-medium">
                            {selectedContact?.customerName || selectedConversation}
                          </h3>
                          <p className="text-[var(--dash-text-muted)] text-sm font-mono">
                            +{selectedConversation}
                          </p>
                        </div>
                      </div>
                    )
                  })()}
                </div>

                {/* Messages */}
                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide p-4 space-y-3"
                  onScroll={(e) => {
                    const target = e.target as HTMLDivElement
                    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100
                    setShouldScrollToBottom(isAtBottom)
                  }}
                >
                  {conversationMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-[var(--dash-text-muted)]">لا توجد رسائل في هذه المحادثة</p>
                    </div>
                  ) : (
                    <>
                      {conversationMessages.map((msg, index) => {
                        const showDate = index === 0 ||
                          formatDate(msg.created_at) !== formatDate(conversationMessages[index - 1].created_at)

                        return (
                          <div key={msg.id || index}>
                            {showDate && (
                              <div className="flex justify-center my-4">
                                <span className="bg-[var(--dash-bg-overlay)]/50 text-[var(--dash-text-secondary)] text-xs px-3 py-1 rounded-full">
                                  {formatDate(msg.created_at)}
                                </span>
                              </div>
                            )}
                            <MessageBubble
                              msg={msg}
                              onReply={(message) => setReplyingTo(message)}
                              onRetry={handleRetryMessage}
                              onContextMenu={(e, message) => {
                                e.preventDefault()
                                setContextMenu({ x: e.clientX, y: e.clientY, msg: message })
                              }}
                              renderMessageContent={renderMessageContent}
                              formatTime={formatTime}
                            />
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Attachment Preview */}
                {attachmentType && (
                  <div className="bg-[var(--dash-bg-raised)] px-4 py-3 border-t border-[var(--dash-border-default)]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[var(--dash-text-primary)] text-sm font-medium">
                        {attachmentType === 'image' && 'إرسال صورة'}
                        {attachmentType === 'video' && 'إرسال فيديو'}
                        {attachmentType === 'document' && 'إرسال مستند'}
                        {attachmentType === 'location' && 'إرسال موقع'}
                      </span>
                      <button
                        onClick={resetAttachment}
                        className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)]"
                        disabled={isUploading}
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>

                    {/* File Preview for Image/Video/Document */}
                    {selectedFile && (attachmentType === 'image' || attachmentType === 'video' || attachmentType === 'document') && (
                      <div className="space-y-3">
                        {/* Image Preview */}
                        {attachmentType === 'image' && filePreview && (
                          <div className="flex justify-center">
                            <img
                              src={filePreview}
                              alt="معاينة الصورة"
                              className="max-h-[200px] max-w-full rounded-lg object-contain"
                            />
                          </div>
                        )}

                        {/* Video Preview */}
                        {attachmentType === 'video' && filePreview && (
                          <div className="flex justify-center">
                            <video
                              src={filePreview}
                              controls
                              className="max-h-[200px] max-w-full rounded-lg"
                            />
                          </div>
                        )}

                        {/* Document Preview */}
                        {attachmentType === 'document' && (
                          <div className="flex items-center gap-3 bg-[var(--dash-bg-surface)] rounded-lg p-3">
                            <DocumentIcon className="h-10 w-10 text-dash-accent-orange flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[var(--dash-text-primary)] text-sm font-medium truncate">{filename}</p>
                              <p className="text-[var(--dash-text-muted)] text-xs">
                                {selectedFile.size > 1024 * 1024
                                  ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
                                  : `${(selectedFile.size / 1024).toFixed(2)} KB`}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Caption Input */}
                        <input
                          type="text"
                          value={caption}
                          onChange={(e) => setCaption(e.target.value)}
                          placeholder="تعليق (اختياري)"
                          className="w-full px-3 py-2 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded-md text-[var(--dash-text-primary)] placeholder-[var(--dash-text-disabled)] text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          disabled={isUploading}
                        />

                        {/* Send Button */}
                        <button
                          type="button"
                          onClick={handleSendMedia}
                          disabled={isUploading || isSending}
                          className={`w-full py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                            isUploading || isSending
                              ? 'bg-[var(--dash-bg-overlay)] text-[var(--dash-text-muted)] cursor-not-allowed'
                              : 'dash-btn-green text-[var(--dash-text-primary)]'
                          }`}
                        >
                          {isUploading ? (
                            <>
                              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                              </svg>
                              <span>جاري الرفع...</span>
                            </>
                          ) : (
                            <>
                              <PaperAirplaneIcon className="h-5 w-5 rotate-180" />
                              <span>إرسال</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Location Preview */}
                    {attachmentType === 'location' && (
                      <div className="space-y-3">
                        {isGettingLocation ? (
                          // Loading indicator while getting location
                          <div className="flex flex-col items-center justify-center py-6 text-[var(--dash-text-muted)]">
                            <svg className="animate-spin h-8 w-8 mb-3 text-dash-accent-green" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                            </svg>
                            <span className="text-sm">جاري تحديد موقعك...</span>
                          </div>
                        ) : latitude && longitude ? (
                          // Location found - show coordinates and send button
                          <>
                            <div className="bg-[var(--dash-bg-surface)] rounded-lg p-3">
                              <div className="flex items-center gap-3 mb-2">
                                <MapPinIcon className="h-8 w-8 text-dash-accent-red flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-[var(--dash-text-primary)] text-sm font-medium">تم تحديد موقعك</p>
                                  <p className="text-[var(--dash-text-muted)] text-xs mt-1">
                                    {parseFloat(latitude).toFixed(6)}, {parseFloat(longitude).toFixed(6)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <input
                              type="text"
                              value={locationName}
                              onChange={(e) => setLocationName(e.target.value)}
                              placeholder="اسم المكان (اختياري)"
                              className="w-full px-3 py-2 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded-md text-[var(--dash-text-primary)] placeholder-[var(--dash-text-disabled)] text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            />

                            <button
                              type="button"
                              onClick={handleSendLocation}
                              disabled={isSending}
                              className={`w-full py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                                isSending
                                  ? 'bg-[var(--dash-bg-overlay)] text-[var(--dash-text-muted)] cursor-not-allowed'
                                  : 'dash-btn-green text-[var(--dash-text-primary)]'
                              }`}
                            >
                              {isSending ? (
                                <>
                                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                  </svg>
                                  <span>جاري الإرسال...</span>
                                </>
                              ) : (
                                <>
                                  <PaperAirplaneIcon className="h-5 w-5 rotate-180" />
                                  <span>إرسال الموقع</span>
                                </>
                              )}
                            </button>
                          </>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}

                {/* Reply Preview Bar */}
                {replyingTo && (
                  <div className="bg-[var(--dash-bg-surface)] px-4 py-2 border-t border-[var(--dash-border-default)] flex items-center gap-3">
                    <div className="w-1 h-10 bg-green-500 rounded-full flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-dash-accent-green text-xs font-medium">
                        {replyingTo.message_type === 'outgoing' ? 'أنت' : replyingTo.customer_name}
                      </p>
                      <p className="text-[var(--dash-text-muted)] text-sm truncate">{replyingTo.message_text}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="p-1 text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]/50 rounded-full transition-colors flex-shrink-0"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                )}

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="bg-[var(--dash-bg-raised)] px-4 py-3 border-t border-[var(--dash-border-default)]">
                  {error && (
                    <div className="flex items-center gap-2 text-dash-accent-red text-sm mb-2">
                      <ExclamationCircleIcon className="h-4 w-4" />
                      <span>{error}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    {/* Attachment Button */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                        className="p-2 text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]/50 rounded-full transition-colors"
                      >
                        <PaperClipIcon className="h-5 w-5" />
                      </button>

                      {/* Hidden File Inputs */}
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => handleFileSelect(e, 'image')}
                      />
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/mp4,video/3gpp,video/quicktime,video/webm"
                        className="hidden"
                        onChange={(e) => handleFileSelect(e, 'video')}
                      />
                      <input
                        ref={documentInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                        className="hidden"
                        onChange={(e) => handleFileSelect(e, 'document')}
                      />

                      {/* Attachment Menu */}
                      {showAttachmentMenu && (
                        <div className="absolute bottom-12 right-0 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded-lg shadow-lg p-2 min-w-[150px]">
                          <button
                            type="button"
                            onClick={() => { imageInputRef.current?.click(); setShowAttachmentMenu(false) }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-overlay)]/50 rounded-md text-sm"
                          >
                            <PhotoIcon className="h-5 w-5 text-dash-accent-blue" />
                            <span>صورة</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { videoInputRef.current?.click(); setShowAttachmentMenu(false) }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-overlay)]/50 rounded-md text-sm"
                          >
                            <VideoCameraIcon className="h-5 w-5 text-dash-accent-purple" />
                            <span>فيديو</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { documentInputRef.current?.click(); setShowAttachmentMenu(false) }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-overlay)]/50 rounded-md text-sm"
                          >
                            <DocumentIcon className="h-5 w-5 text-dash-accent-orange" />
                            <span>مستند</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleGetLocation}
                            className="flex items-center gap-2 w-full px-3 py-2 text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-overlay)]/50 rounded-md text-sm"
                          >
                            <MapPinIcon className="h-5 w-5 text-dash-accent-red" />
                            <span>موقع</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Emoji Picker Button - يظهر فقط على الديسكتوب لأن الموبايل فيه emoji مدمج */}
                    <div className="relative hidden md:block">
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="p-2 text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]/50 rounded-full transition-colors"
                        title="إضافة emoji"
                      >
                        <FaceSmileIcon className="h-5 w-5" />
                      </button>

                      {/* Emoji Picker Popup */}
                      <EmojiPicker
                        isOpen={showEmojiPicker}
                        onClose={() => setShowEmojiPicker(false)}
                        onEmojiSelect={(emoji) => {
                          setNewMessage(prev => prev + emoji)
                          // الـ picker يفضل مفتوح - يتقفل بس لما يدوس برا
                        }}
                      />
                    </div>

                    {/* Voice Recorder or Text Input */}
                    {isRecordingVoice ? (
                      <VoiceRecorder
                        onSend={sendVoiceNote}
                        onCancel={() => setIsRecordingVoice(false)}
                        isRecording={isRecordingVoice}
                        setIsRecording={setIsRecordingVoice}
                      />
                    ) : (
                      <>
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder={attachmentType ? "تعليق إضافي (اختياري)..." : "اكتب رسالتك هنا..."}
                          className="flex-1 px-4 py-2 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded-full text-[var(--dash-text-primary)] placeholder-[var(--dash-text-disabled)] focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          disabled={isSending}
                        />

                        {/* Show send button if there's text or attachment, otherwise show mic button */}
                        {(newMessage.trim() || attachmentType) ? (
                          <button
                            type="submit"
                            disabled={isSending}
                            className={`p-3 rounded-full transition-colors ${
                              !isSending
                                ? 'dash-btn-green text-[var(--dash-text-primary)]'
                                : 'bg-[var(--dash-bg-overlay)] text-[var(--dash-text-muted)] cursor-not-allowed'
                            }`}
                          >
                            {isSending ? (
                              <ClockIcon className="h-5 w-5 animate-pulse" />
                            ) : (
                              <PaperAirplaneIcon className="h-5 w-5 rotate-180" />
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsRecordingVoice(true)}
                            className="p-3 rounded-full dash-btn-green text-[var(--dash-text-primary)] transition-colors"
                            title="تسجيل رسالة صوتية"
                          >
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93V7h2v1c0 2.76 2.24 5 5 5s5-2.24 5-5V7h2v1c0 4.08-3.06 7.44-7 7.93V18h3v2H9v-2h3v-2.07z"/>
                            </svg>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </form>
              </>
            ) : (
              /* No Conversation Selected */
              <div className="flex-1 flex flex-col items-center justify-center text-[var(--dash-text-muted)]">
                <ChatBubbleLeftRightIcon className="h-24 w-24 text-[var(--dash-text-disabled)] mb-4" />
                <h3 className="text-xl font-medium mb-2">مرحباً بك في محادثات واتساب</h3>
                <p className="text-sm">اختر محادثة من القائمة للبدء</p>
                {connectionStatus === 'disconnected' && (
                  <div className="mt-4 p-4 bg-dash-accent-red-subtle border border-dash-accent-red/30 rounded-lg max-w-md">
                    <p className="text-dash-accent-red text-sm text-center">
                      الواتساب غير متصل. تأكد من إعداد WasenderAPI وإضافة الـ API Token.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Context Menu for Reply */}
      {contextMenu && (
        <>
          {/* Backdrop to close menu */}
          <div
            className="fixed inset-0 z-50"
            onClick={() => setContextMenu(null)}
          />
          {/* Menu */}
          <div
            className="fixed z-50 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded-lg shadow-lg py-1 min-w-[140px]"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 160),
              top: Math.min(contextMenu.y, window.innerHeight - 100),
            }}
          >
            <button
              onClick={() => {
                setReplyingTo(contextMenu.msg)
                setContextMenu(null)
              }}
              className="flex items-center gap-2 w-full px-4 py-2 text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]/50 text-sm"
            >
              <ArrowUturnLeftIcon className="h-4 w-4" />
              <span>رد على الرسالة</span>
            </button>
          </div>
        </>
      )}

      {/* Global Styles */}
      <style jsx global>{`
        .scrollbar-hide {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}
