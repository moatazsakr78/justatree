'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // التحقق من حالة الاتصال عند التحميل
    setIsOffline(!navigator.onLine);

    // الاستماع لأحداث الاتصال
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // عند offline - عرض الـ children مباشرة بدون انتظار الـ session
  // لأن API لن تستجيب والبيانات ستأتي من IndexedDB
  if (isOffline) {
    return <>{children}</>;
  }

  // Show loading state while session is being determined
  // This prevents content flash during hydration
  if (status === 'loading') {
    return (
      <div className="h-screen bg-dash-base flex items-center justify-center">
        <div className="text-[var(--dash-text-primary)] text-xl">جاري التحميل...</div>
      </div>
    );
  }

  // Middleware handles all permission checks
  // If user reached here, they have access
  return <>{children}</>;
}
