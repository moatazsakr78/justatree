'use client'

import { useState, useRef, useCallback } from 'react'
import { useProductVideos, ProductVideo } from '../lib/hooks/useProductVideos'

interface ProductVideoUploadProps {
  productId?: string
  videos: ProductVideo[]
  onVideoAdd: (video: ProductVideo) => void
  onVideoRemove: (videoId: string) => void
  onVideoReorder: (videos: ProductVideo[]) => void
  disabled?: boolean
}

export default function ProductVideoUpload({
  productId,
  videos = [],
  onVideoAdd,
  onVideoRemove,
  onVideoReorder,
  disabled = false
}: ProductVideoUploadProps) {
  const { uploadVideo, deleteVideo, isLoading, error } = useProductVideos()
  const [isDragOver, setIsDragOver] = useState(false)
  const [draggedVideo, setDraggedVideo] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFileUpload(files)
  }

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled && productId) {
      setIsDragOver(true)
    }
  }, [disabled, productId])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    if (disabled || !productId) return

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('video/')
    )

    if (files.length > 0) {
      handleFileUpload(files)
    }
  }, [disabled, productId])

  // Upload videos with real progress tracking
  const handleFileUpload = async (files: File[]) => {
    if (!files.length || disabled) return

    // Check if productId is valid before uploading
    if (!productId) {
      alert('يجب حفظ المنتج أولاً قبل رفع الفيديوهات')
      return
    }

    for (const file of files) {
      const tempId = Math.random().toString(36).substring(2)
      setUploadProgress(prev => ({ ...prev, [tempId]: 0 }))

      try {
        // Use the built-in progress tracking from uploadVideo
        const result = await uploadVideo(productId, file, file.name, (progress) => {
          setUploadProgress(prev => ({ ...prev, [tempId]: progress }))
        })

        if (result.success && result.video) {
          // Add video to list
          onVideoAdd(result.video)

          // Remove progress after a short delay to show completion
          setTimeout(() => {
            setUploadProgress(prev => {
              const newProgress = { ...prev }
              delete newProgress[tempId]
              return newProgress
            })
          }, 1500)
        } else {
          alert(result.error || 'فشل في رفع الفيديو')
          setUploadProgress(prev => {
            const newProgress = { ...prev }
            delete newProgress[tempId]
            return newProgress
          })
        }
      } catch (error) {
        console.error('Video upload error:', error)
        alert('حدث خطأ أثناء رفع الفيديو')
        setUploadProgress(prev => {
          const newProgress = { ...prev }
          delete newProgress[tempId]
          return newProgress
        })
      }
    }
  }

  // Delete video
  const handleDeleteVideo = async (video: ProductVideo) => {
    if (!confirm(`هل أنت متأكد من حذف الفيديو "${video.video_name}"؟`)) return

    const success = await deleteVideo(video.id)
    if (success) {
      onVideoRemove(video.id)
    } else {
      alert('فشل في حذف الفيديو')
    }
  }

  // Video drag and drop for reordering
  const handleVideoDragStart = (e: React.DragEvent, videoId: string) => {
    setDraggedVideo(videoId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleVideoDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleVideoDrop = (e: React.DragEvent, targetVideoId: string) => {
    e.preventDefault()

    if (!draggedVideo || draggedVideo === targetVideoId) {
      setDraggedVideo(null)
      return
    }

    const reorderedVideos = [...videos]
    const draggedIndex = reorderedVideos.findIndex(v => v.id === draggedVideo)
    const targetIndex = reorderedVideos.findIndex(v => v.id === targetVideoId)

    if (draggedIndex === -1 || targetIndex === -1) return

    // Remove dragged item and insert at target position
    const [draggedVideoData] = reorderedVideos.splice(draggedIndex, 1)
    reorderedVideos.splice(targetIndex, 0, draggedVideoData)

    // Update sort order
    const updatedVideos = reorderedVideos.map((video, index) => ({
      ...video,
      sort_order: index
    }))

    onVideoReorder(updatedVideos)
    setDraggedVideo(null)
  }

  const handleVideoDragEnd = () => {
    setDraggedVideo(null)
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[var(--dash-text-secondary)]">
          فيديوهات المنتج
        </label>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && productId && fileInputRef.current?.click()}
          className={`flex items-center justify-center w-full px-4 py-8 border-2 border-dashed rounded-lg transition-all ${
            !productId
              ? 'border-[var(--dash-border-default)] bg-[var(--dash-bg-surface)] cursor-not-allowed opacity-60'
              : isDragOver
              ? 'border-blue-400 bg-blue-900/20 cursor-pointer'
              : 'border-[var(--dash-border-default)] bg-[var(--dash-bg-surface)] hover:border-blue-500 hover:bg-blue-900/10 cursor-pointer'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="text-center">
            {isLoading ? (
              <>
                <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-red-500 text-sm">جاري الرفع...</span>
              </>
            ) : !productId ? (
              <>
                <svg className="h-8 w-8 text-[var(--dash-text-muted)] mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-[var(--dash-text-secondary)] text-sm">
                  يجب حفظ المنتج أولاً قبل رفع الفيديوهات
                </span>
                <p className="text-xs text-[var(--dash-text-muted)] mt-1">اضغط على &quot;حفظ&quot; أو &quot;إنشاء&quot; أولاً</p>
              </>
            ) : (
              <>
                <svg className="h-8 w-8 text-blue-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="text-[var(--dash-text-secondary)] text-sm">
                  {isDragOver ? 'اتركها هنا' : 'انقر لاختيار فيديوهات المنتج'}
                </span>
                <p className="text-xs text-[var(--dash-text-muted)] mt-1">MP4, WebM, MOV - حتى 100MB لكل ملف</p>
              </>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled || !productId}
        />
      </div>

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([id, progress]) => (
            <div key={id} className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-blue-400">جاري رفع الفيديو...</span>
                <span className="text-sm text-blue-300">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-blue-900/40 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Videos List */}
      {videos.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-[var(--dash-text-secondary)]">
            الفيديوهات المرفوعة ({videos.length})
          </h4>

          <div className="space-y-2">
            {videos
              .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
              .map((video) => (
                <div
                  key={video.id}
                  draggable={!disabled}
                  onDragStart={(e) => handleVideoDragStart(e, video.id)}
                  onDragOver={handleVideoDragOver}
                  onDrop={(e) => handleVideoDrop(e, video.id)}
                  onDragEnd={handleVideoDragEnd}
                  className={`flex items-center gap-3 p-3 bg-[var(--dash-bg-raised)] rounded-lg border border-[var(--dash-border-default)]/30 transition-all ${
                    draggedVideo === video.id
                      ? 'opacity-50 scale-95'
                      : 'hover:bg-[var(--dash-bg-overlay)] hover:border-[var(--dash-border-subtle)]/50'
                  } ${disabled ? 'opacity-50' : 'cursor-move'}`}
                >
                  {/* Drag Handle */}
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-[var(--dash-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </div>

                  {/* Video Preview */}
                  <div className="flex-shrink-0 w-20 h-12 bg-[var(--dash-bg-surface)] rounded overflow-hidden border border-[var(--dash-border-default)]/50">
                    <video
                      src={video.video_url}
                      className="w-full h-full object-cover"
                      muted
                      preload="metadata"
                    />
                  </div>

                  {/* Video Info */}
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-[var(--dash-text-primary)] truncate text-sm">
                      {video.video_name || 'فيديو بدون اسم'}
                    </h5>
                    <div className="flex items-center gap-4 text-xs text-[var(--dash-text-muted)] mt-1">
                      {video.video_size && (
                        <span>{(video.video_size / (1024 * 1024)).toFixed(1)} MB</span>
                      )}
                      {video.duration && (
                        <span>{Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Play Button */}
                    <button
                      onClick={() => {
                        const videoElement = document.createElement('video')
                        videoElement.src = video.video_url
                        videoElement.controls = true
                        videoElement.style.maxWidth = '80vw'
                        videoElement.style.maxHeight = '80vh'

                        const modal = document.createElement('div')
                        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75'
                        modal.onclick = () => document.body.removeChild(modal)
                        modal.appendChild(videoElement)
                        document.body.appendChild(modal)
                      }}
                      className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded-full transition-colors"
                      title="تشغيل الفيديو"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteVideo(video)}
                      disabled={disabled}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="حذف الفيديو"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      {videos.length === 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-[var(--dash-text-disabled)]">
            لم يتم رفع أي فيديوهات بعد. يمكنك رفع عدة فيديوهات لعرض المنتج بشكل أفضل.
          </p>
        </div>
      )}
    </div>
  )
}