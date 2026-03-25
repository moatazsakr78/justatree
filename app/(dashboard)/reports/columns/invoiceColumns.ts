'use client';

import React from 'react';

export const getCustomerInvoicesTableColumns = (formatPrice: (value: number) => string) => [
  {
    id: 'index',
    header: '#',
    accessor: '#',
    width: 60,
    visible: true
  },
  {
    id: 'last_transaction_date',
    header: 'آخر تاريخ تعامل',
    accessor: 'last_transaction_date',
    width: 140,
    visible: true,
    render: (value: string) => {
      if (!value) return React.createElement('span', { className: 'text-[var(--dash-text-muted)]' }, '-');
      const date = new Date(value);
      return React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, date.toLocaleDateString('ar-EG'));
    }
  },
  {
    id: 'avg_transaction_frequency',
    header: 'متوسط التعامل',
    accessor: 'avg_transaction_frequency',
    width: 130,
    visible: true,
    render: (value: number) => {
      if (!value || value === 0) return React.createElement('span', { className: 'text-[var(--dash-text-muted)]' }, '-');
      if (value === 1) return React.createElement('span', { className: 'text-dash-accent-green' }, '\u064A\u0648\u0645\u064A\u0627\u064B');
      return React.createElement('span', { className: 'text-dash-accent-blue' }, `\u0643\u0644 ${Math.round(value)} \u064A\u0648\u0645`);
    }
  },
  {
    id: 'customer_name',
    header: 'اسم العميل',
    accessor: 'customer_name',
    width: 180,
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
    id: 'total_items_quantity',
    header: 'كمية المنتجات',
    accessor: 'total_items_quantity',
    width: 120,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-dash-accent-purple font-medium' }, value || 0)
  },
  {
    id: 'total_amount',
    header: 'الإجمالي',
    accessor: 'total_amount',
    width: 130,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-dash-accent-green font-medium' }, formatPrice(value || 0))
  },
  {
    id: 'balance',
    header: 'الرصيد',
    accessor: 'balance',
    width: 130,
    visible: true,
    render: (value: number) => {
      const balance = value || 0;
      const colorClass = balance > 0 ? 'text-dash-accent-red' : balance < 0 ? 'text-dash-accent-green' : 'text-[var(--dash-text-muted)]';
      return React.createElement('span', { className: `${colorClass} font-medium` }, formatPrice(balance));
    }
  }
];

export const getDailySalesTableColumns = (formatPrice: (value: number) => string) => [
  {
    id: 'index',
    header: '#',
    accessor: '#',
    width: 60,
    visible: true
  },
  {
    id: 'sale_date',
    header: 'التاريخ',
    accessor: 'sale_date',
    width: 140,
    visible: true,
    render: (value: string) => {
      if (!value) return React.createElement('span', { className: 'text-[var(--dash-text-muted)]' }, '-');
      const date = new Date(value);
      return React.createElement('span', { className: 'text-[var(--dash-text-primary)] font-medium' }, date.toLocaleDateString('ar-EG'));
    }
  },
  {
    id: 'day_name',
    header: 'اليوم',
    accessor: 'day_name',
    width: 100,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-dash-accent-blue' }, value || '-')
  },
  {
    id: 'invoice_count',
    header: 'عدد الفواتير',
    accessor: 'invoice_count',
    width: 110,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-dash-accent-purple font-medium' }, value || 0)
  },
  {
    id: 'total_sales',
    header: 'إجمالي المبيعات',
    accessor: 'total_sales',
    width: 150,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-dash-accent-green font-medium' }, formatPrice(value || 0))
  },
  {
    id: 'avg_sale',
    header: 'متوسط الفاتورة',
    accessor: 'avg_sale',
    width: 130,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, formatPrice(value || 0))
  }
];

export const getHourlySalesTableColumns = (formatPrice: (value: number) => string) => [
  {
    id: 'index',
    header: '#',
    accessor: '#',
    width: 60,
    visible: true
  },
  {
    id: 'hour_range',
    header: 'الساعة',
    accessor: 'hour_range',
    width: 150,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-primary)] font-medium' }, value || '-')
  },
  {
    id: 'total_sales',
    header: 'إجمالي المبيعات',
    accessor: 'total_sales',
    width: 150,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-dash-accent-green font-medium' }, formatPrice(value || 0))
  },
  {
    id: 'sales_count',
    header: 'عدد المبيعات',
    accessor: 'sales_count',
    width: 120,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-dash-accent-blue font-medium' }, value || 0)
  },
  {
    id: 'avg_sale',
    header: 'متوسط المبيعة',
    accessor: 'avg_sale',
    width: 130,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, formatPrice(value || 0))
  },
  {
    id: 'percentage',
    header: 'النسبة %',
    accessor: 'percentage',
    width: 100,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-dash-accent-orange font-medium' }, `${(value || 0).toFixed(2)}%`)
  }
];
