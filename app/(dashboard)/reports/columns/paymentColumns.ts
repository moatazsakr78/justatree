'use client';

import React from 'react';

export const getPaymentMethodsTableColumns = (formatPrice: (value: number) => string) => [
  {
    id: 'index',
    header: '#',
    accessor: '#',
    width: 60,
    visible: true
  },
  {
    id: 'payment_method_ar',
    header: 'طريقة الدفع',
    accessor: 'payment_method_ar',
    width: 160,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-primary)] font-medium' }, value || 'غير محدد')
  },
  {
    id: 'invoice_count',
    header: 'عدد الفواتير',
    accessor: 'invoice_count',
    width: 110,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-dash-accent-blue font-medium' }, value || 0)
  },
  {
    id: 'total_amount',
    header: 'الإجمالي',
    accessor: 'total_amount',
    width: 140,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-dash-accent-green font-medium' }, formatPrice(value || 0))
  },
  {
    id: 'percentage',
    header: 'النسبة %',
    accessor: 'percentage',
    width: 100,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-dash-accent-orange font-medium' }, `${(value || 0).toFixed(2)}%`)
  },
  {
    id: 'avg_invoice',
    header: 'متوسط الفاتورة',
    accessor: 'avg_invoice',
    width: 130,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, formatPrice(value || 0))
  }
];

export const getReturnsTableColumns = (formatPrice: (value: number) => string) => [
  {
    id: 'index',
    header: '#',
    accessor: '#',
    width: 60,
    visible: true
  },
  {
    id: 'invoice_number',
    header: 'رقم الفاتورة',
    accessor: 'invoice_number',
    width: 120,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, value || '-')
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
    width: 160,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, value || 'غير محدد')
  },
  {
    id: 'product_name',
    header: 'المنتج',
    accessor: 'product_name',
    width: 200,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-primary)] font-medium' }, value || '-')
  },
  {
    id: 'quantity',
    header: 'الكمية',
    accessor: 'quantity',
    width: 80,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, value || 0)
  },
  {
    id: 'unit_price',
    header: 'سعر الوحدة',
    accessor: 'unit_price',
    width: 110,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, formatPrice(value || 0))
  },
  {
    id: 'total_amount',
    header: 'المبلغ',
    accessor: 'total_amount',
    width: 120,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-dash-accent-red font-medium' }, formatPrice(value || 0))
  },
  {
    id: 'cashier_name',
    header: 'الكاشير',
    accessor: 'cashier_name',
    width: 140,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, value || 'غير محدد')
  }
];
