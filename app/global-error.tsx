'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, backgroundColor: '#1F2937', fontFamily: 'Cairo, sans-serif' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}>
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            borderRadius: '0.75rem',
            backgroundColor: '#2B3544',
            maxWidth: '28rem',
            width: '100%',
            margin: '0 1rem',
          }}>
            <div style={{ color: '#F87171', fontSize: '3rem', marginBottom: '1rem' }}>⚠</div>
            <h2 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              حدث خطأ غير متوقع
            </h2>
            <p style={{ color: '#9CA3AF', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              نعتذر عن هذا الخطأ. يمكنك المحاولة مرة أخرى.
            </p>
            <button
              onClick={reset}
              style={{
                padding: '0.625rem 1.5rem',
                backgroundColor: '#2563EB',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '1rem',
              }}
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
