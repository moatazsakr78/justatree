'use client';

import { ShieldExclamationIcon, HomeIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { getUnauthorizedRedirect, UserRole } from '@/app/lib/auth/roleBasedAccess';

interface UnauthorizedAccessProps {
  userRole: UserRole | null;
  message?: string;
}

export default function UnauthorizedAccess({ userRole, message }: UnauthorizedAccessProps) {
  const router = useRouter();

  const defaultMessage = 'هذه الصفحة للمشرفين فقط، غير مصرح لك بالدخول';
  const displayMessage = message || defaultMessage;
  
  const handleGoBack = () => {
    const redirectPath = getUnauthorizedRedirect(userRole);
    router.push(redirectPath);
  };

  return (
    <div className="min-h-screen bg-dash-base flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <ShieldExclamationIcon className="mx-auto h-24 w-24 text-[var(--dash-accent-red)] mb-6" />

        <h1 className="text-3xl font-bold text-[var(--dash-text-primary)] mb-4">
          غير مصرح بالوصول
        </h1>

        <p className="text-[var(--dash-text-secondary)] text-lg mb-8 leading-relaxed">
          {displayMessage}
        </p>

        <div className="space-y-4">
          <button
            onClick={handleGoBack}
            className="w-full flex items-center justify-center gap-3 bg-[var(--dash-accent-blue)] hover:bg-blue-700 text-[var(--dash-text-primary)] font-medium py-3 px-6 rounded-dash-md transition-colors"
          >
            <HomeIcon className="h-5 w-5" />
            العودة للصفحة الرئيسية
          </button>

          <button
            onClick={() => router.back()}
            className="w-full bg-[var(--dash-bg-overlay)] hover:bg-[var(--dash-bg-highlight)] text-[var(--dash-text-primary)] font-medium py-3 px-6 rounded-dash-md transition-colors"
          >
            العودة للصفحة السابقة
          </button>
        </div>

        {/* Role Info */}
        {userRole && (
          <div className="mt-8 p-4 bg-[var(--dash-bg-raised)] rounded-dash-md">
            <p className="text-[var(--dash-text-muted)] text-sm">
              دورك الحالي: <span className="text-[var(--dash-text-primary)] font-medium">{userRole}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}