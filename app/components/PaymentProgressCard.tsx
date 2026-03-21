'use client';

import { CheckCircleIcon, ClockIcon, CreditCardIcon } from '@heroicons/react/24/outline';

interface PaymentProgressCardProps {
  orderAmount: number;
  totalPaid: number;
  paymentProgress: number;
  fullyPaid: boolean;
  onUploadReceipt: () => void;
}

export default function PaymentProgressCard({
  orderAmount,
  totalPaid,
  paymentProgress,
  fullyPaid,
  onUploadReceipt,
}: PaymentProgressCardProps) {
  const remainingAmount = orderAmount - totalPaid;
  const progressPercentage = Math.min(paymentProgress, 100);

  return (
    <div className="bg-[var(--dash-bg-surface)] rounded-lg border border-[var(--dash-border-default)] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CreditCardIcon className="w-6 h-6 text-dash-accent-blue" />
          <h3 className="text-lg font-bold text-[var(--dash-text-primary)]">حالة الدفع</h3>
        </div>
        {fullyPaid ? (
          <div className="flex items-center gap-2 bg-dash-accent-green-subtle px-3 py-1 rounded-full">
            <CheckCircleIcon className="w-5 h-5 text-dash-accent-green" />
            <span className="text-dash-accent-green text-sm font-medium">مدفوع بالكامل</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-dash-accent-orange-subtle px-3 py-1 rounded-full">
            <ClockIcon className="w-5 h-5 text-dash-accent-orange" />
            <span className="text-dash-accent-orange text-sm font-medium">في انتظار الدفع</span>
          </div>
        )}
      </div>

      {/* Payment Details */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-[var(--dash-text-secondary)]">المبلغ الإجمالي:</span>
          <span className="text-[var(--dash-text-primary)] font-bold text-lg">{orderAmount.toFixed(2)} جنيه</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[var(--dash-text-secondary)]">المدفوع:</span>
          <span className="text-dash-accent-green font-bold">{totalPaid.toFixed(2)} جنيه</span>
        </div>
        {!fullyPaid && (
          <div className="flex justify-between items-center border-t border-[var(--dash-border-default)] pt-3">
            <span className="text-[var(--dash-text-secondary)]">المتبقي:</span>
            <span className="text-dash-accent-orange font-bold text-lg">{remainingAmount.toFixed(2)} جنيه</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[var(--dash-text-secondary)] text-sm">نسبة الإنجاز</span>
          <span className="text-[var(--dash-text-primary)] font-bold">{progressPercentage.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-[var(--dash-bg-raised)] rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              fullyPaid ? 'bg-dash-accent-green' : 'bg-dash-accent-blue'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Upload Receipt Button */}
      {!fullyPaid && (
        <button
          onClick={onUploadReceipt}
          className="w-full py-3 dash-btn-primary rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          رفع إيصال الدفع
        </button>
      )}

      {/* Help Text */}
      <div className="mt-4 p-3 bg-dash-accent-blue-subtle border border-dash-accent-blue/30 rounded-lg">
        <p className="text-dash-accent-blue text-sm">
          {fullyPaid
            ? '✓ تم استلام كامل المبلغ. شكراً لك!'
            : 'يرجى رفع صورة إيصال التحويل البنكي للتحقق من الدفع'}
        </p>
      </div>
    </div>
  );
}
