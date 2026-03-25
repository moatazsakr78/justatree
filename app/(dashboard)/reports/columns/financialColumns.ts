'use client';

import React from 'react';

export const getCustomerBalancesTableColumns = (formatPrice: (value: number) => string) => [
  {
    id: 'index',
    header: '#',
    accessor: '#',
    width: 60,
    visible: true
  },
  {
    id: 'customer_name',
    header: 'اسم العميل',
    accessor: 'customer_name',
    width: 200,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-primary)] font-medium' }, value || 'غير محدد')
  },
  {
    id: 'phone',
    header: 'الهاتف',
    accessor: 'phone',
    width: 120,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)] font-mono' }, value || 'غير محدد')
  },
  {
    id: 'city',
    header: 'المدينة',
    accessor: 'city',
    width: 100,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, value || 'غير محدد')
  },
  {
    id: 'account_balance',
    header: 'الرصيد',
    accessor: 'account_balance',
    width: 130,
    visible: true,
    render: (value: number) => {
      const balance = value || 0;
      const colorClass = balance > 0 ? 'text-dash-accent-red' : balance < 0 ? 'text-dash-accent-green' : 'text-[var(--dash-text-muted)]';
      return React.createElement('span', { className: `${colorClass} font-medium` }, formatPrice(balance));
    }
  },
  {
    id: 'credit_limit',
    header: 'حد الائتمان',
    accessor: 'credit_limit',
    width: 120,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, formatPrice(value || 0))
  },
  {
    id: 'payment_count',
    header: 'عدد الدفعات',
    accessor: 'payment_count',
    width: 100,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-dash-accent-blue font-medium' }, value || 0)
  },
  {
    id: 'last_payment_date',
    header: 'آخر دفعة',
    accessor: 'last_payment_date',
    width: 120,
    visible: true,
    render: (value: string) => {
      if (!value) return React.createElement('span', { className: 'text-[var(--dash-text-muted)]' }, '-');
      const date = new Date(value);
      return React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, date.toLocaleDateString('ar-EG'));
    }
  }
];

export const getSupplierBalancesTableColumns = (formatPrice: (value: number) => string) => [
  {
    id: 'index',
    header: '#',
    accessor: '#',
    width: 60,
    visible: true
  },
  {
    id: 'supplier_name',
    header: 'اسم المورد',
    accessor: 'supplier_name',
    width: 200,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-primary)] font-medium' }, value || 'غير محدد')
  },
  {
    id: 'phone',
    header: 'الهاتف',
    accessor: 'phone',
    width: 120,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)] font-mono' }, value || 'غير محدد')
  },
  {
    id: 'account_balance',
    header: 'الرصيد',
    accessor: 'account_balance',
    width: 130,
    visible: true,
    render: (value: number) => {
      const balance = value || 0;
      const colorClass = balance > 0 ? 'text-dash-accent-red' : balance < 0 ? 'text-dash-accent-green' : 'text-[var(--dash-text-muted)]';
      return React.createElement('span', { className: `${colorClass} font-medium` }, formatPrice(balance));
    }
  },
  {
    id: 'payment_count',
    header: 'عدد الدفعات',
    accessor: 'payment_count',
    width: 100,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-dash-accent-blue font-medium' }, value || 0)
  },
  {
    id: 'last_payment_date',
    header: 'آخر دفعة',
    accessor: 'last_payment_date',
    width: 120,
    visible: true,
    render: (value: string) => {
      if (!value) return React.createElement('span', { className: 'text-[var(--dash-text-muted)]' }, '-');
      const date = new Date(value);
      return React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, date.toLocaleDateString('ar-EG'));
    }
  }
];

export const getCashDrawerTableColumns = (formatPrice: (value: number) => string) => [
  {
    id: 'index',
    header: '#',
    accessor: '#',
    width: 60,
    visible: true
  },
  {
    id: 'created_at',
    header: 'التاريخ',
    accessor: 'created_at',
    width: 160,
    visible: true,
    render: (value: string) => {
      if (!value) return React.createElement('span', { className: 'text-[var(--dash-text-muted)]' }, '-');
      const date = new Date(value);
      return React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' },
        `${date.toLocaleDateString('ar-EG')} ${date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`
      );
    }
  },
  {
    id: 'transaction_type_ar',
    header: 'نوع العملية',
    accessor: 'transaction_type_ar',
    width: 140,
    visible: true,
    render: (value: string) => {
      const typeConfig: Record<string, { bg: string; text: string }> = {
        'إيداع': { bg: 'bg-dash-accent-green/10', text: 'text-dash-accent-green' },
        'سحب': { bg: 'bg-dash-accent-red/10', text: 'text-dash-accent-red' },
        'بيع': { bg: 'bg-dash-accent-blue/10', text: 'text-dash-accent-blue' },
        'مرتجع': { bg: 'bg-dash-accent-orange/10', text: 'text-dash-accent-orange' }
      };
      const config = typeConfig[value || ''] || { bg: 'bg-[var(--dash-bg-highlight)]/20', text: 'text-[var(--dash-text-muted)]' };
      return React.createElement('span', {
        className: `px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`
      }, value || '-');
    }
  },
  {
    id: 'amount',
    header: 'المبلغ',
    accessor: 'amount',
    width: 130,
    visible: true,
    render: (value: number) => {
      const amount = value || 0;
      const colorClass = amount >= 0 ? 'text-dash-accent-green' : 'text-dash-accent-red';
      return React.createElement('span', { className: `${colorClass} font-medium` }, formatPrice(amount));
    }
  },
  {
    id: 'balance_after',
    header: 'الرصيد بعد',
    accessor: 'balance_after',
    width: 130,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-[var(--dash-text-primary)] font-medium' }, formatPrice(value || 0))
  },
  {
    id: 'notes',
    header: 'الملاحظات',
    accessor: 'notes',
    width: 200,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-muted)]' }, value || '-')
  },
  {
    id: 'performed_by',
    header: 'المنفذ',
    accessor: 'performed_by',
    width: 140,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, value || 'غير محدد')
  }
];

export const getCustomerPaymentsTableColumns = (formatPrice: (value: number) => string) => [
  {
    id: 'index',
    header: '#',
    accessor: '#',
    width: 60,
    visible: true
  },
  {
    id: 'created_at',
    header: 'التاريخ',
    accessor: 'created_at',
    width: 130,
    visible: true,
    render: (value: string) => {
      if (!value) return React.createElement('span', { className: 'text-[var(--dash-text-muted)]' }, '-');
      const date = new Date(value);
      return React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, date.toLocaleDateString('ar-EG'));
    }
  },
  {
    id: 'customer_name',
    header: 'العميل',
    accessor: 'customer_name',
    width: 180,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-primary)] font-medium' }, value || 'غير محدد')
  },
  {
    id: 'amount',
    header: 'المبلغ',
    accessor: 'amount',
    width: 130,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-dash-accent-green font-medium' }, formatPrice(value || 0))
  },
  {
    id: 'payment_method',
    header: 'طريقة الدفع',
    accessor: 'payment_method',
    width: 120,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, value || 'غير محدد')
  },
  {
    id: 'reference_number',
    header: 'الرقم المرجعي',
    accessor: 'reference_number',
    width: 130,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)] font-mono' }, value || '-')
  },
  {
    id: 'notes',
    header: 'الملاحظات',
    accessor: 'notes',
    width: 200,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-muted)]' }, value || '-')
  }
];
