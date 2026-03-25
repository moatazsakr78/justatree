'use client';

import React from 'react';

export const getPurchaseItemsTableColumns = (formatPrice: (value: number) => string) => [
  {
    id: 'index',
    header: '#',
    accessor: '#',
    width: 60,
    visible: true
  },
  {
    id: 'product_name',
    header: 'اسم المنتج',
    accessor: 'product_name',
    width: 200,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-primary)] font-medium' }, value || '-')
  },
  {
    id: 'category_name',
    header: 'التصنيف',
    accessor: 'category_name',
    width: 140,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, value || 'غير محدد')
  },
  {
    id: 'total_quantity',
    header: 'الكمية',
    accessor: 'total_quantity',
    width: 90,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-dash-accent-blue font-medium' }, value || 0)
  },
  {
    id: 'avg_unit_price',
    header: 'متوسط سعر الشراء',
    accessor: 'avg_unit_price',
    width: 140,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, formatPrice(value || 0))
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
    id: 'supplier_name',
    header: 'المورد',
    accessor: 'supplier_name',
    width: 160,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, value || 'غير محدد')
  },
  {
    id: 'last_purchase_date',
    header: 'آخر شراء',
    accessor: 'last_purchase_date',
    width: 120,
    visible: true,
    render: (value: string) => {
      if (!value) return React.createElement('span', { className: 'text-[var(--dash-text-muted)]' }, '-');
      const date = new Date(value);
      return React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, date.toLocaleDateString('ar-EG'));
    }
  }
];

export const getPurchaseSupplierTableColumns = (formatPrice: (value: number) => string) => [
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
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-primary)] font-medium' }, value || '-')
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
    id: 'invoice_count',
    header: 'عدد الفواتير',
    accessor: 'invoice_count',
    width: 110,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-dash-accent-blue font-medium' }, value || 0)
  },
  {
    id: 'total_amount',
    header: 'إجمالي المشتريات',
    accessor: 'total_amount',
    width: 150,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-dash-accent-green font-medium' }, formatPrice(value || 0))
  },
  {
    id: 'discount_amount',
    header: 'الخصم',
    accessor: 'discount_amount',
    width: 100,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, formatPrice(value || 0))
  },
  {
    id: 'net_amount',
    header: 'الصافي',
    accessor: 'net_amount',
    width: 140,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-[var(--dash-text-primary)] font-medium' }, formatPrice(value || 0))
  },
  {
    id: 'last_invoice_date',
    header: 'آخر فاتورة',
    accessor: 'last_invoice_date',
    width: 120,
    visible: true,
    render: (value: string) => {
      if (!value) return React.createElement('span', { className: 'text-[var(--dash-text-muted)]' }, '-');
      const date = new Date(value);
      return React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, date.toLocaleDateString('ar-EG'));
    }
  }
];

export const getPurchaseInvoicesTableColumns = (formatPrice: (value: number) => string) => [
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
    id: 'invoice_date',
    header: 'التاريخ',
    accessor: 'invoice_date',
    width: 120,
    visible: true,
    render: (value: string) => {
      if (!value) return React.createElement('span', { className: 'text-[var(--dash-text-muted)]' }, '-');
      const date = new Date(value);
      return React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, date.toLocaleDateString('ar-EG'));
    }
  },
  {
    id: 'supplier_name',
    header: 'المورد',
    accessor: 'supplier_name',
    width: 160,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, value || 'غير محدد')
  },
  {
    id: 'total_amount',
    header: 'المبلغ',
    accessor: 'total_amount',
    width: 120,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, formatPrice(value || 0))
  },
  {
    id: 'discount_amount',
    header: 'الخصم',
    accessor: 'discount_amount',
    width: 100,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, formatPrice(value || 0))
  },
  {
    id: 'tax_amount',
    header: 'الضريبة',
    accessor: 'tax_amount',
    width: 100,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, formatPrice(value || 0))
  },
  {
    id: 'net_amount',
    header: 'الصافي',
    accessor: 'net_amount',
    width: 130,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-dash-accent-green font-medium' }, formatPrice(value || 0))
  },
  {
    id: 'invoice_type',
    header: 'نوع الفاتورة',
    accessor: 'invoice_type',
    width: 120,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, value || '-')
  },
  {
    id: 'payment_status',
    header: 'حالة الدفع',
    accessor: 'payment_status',
    width: 120,
    visible: true,
    render: (value: string) => {
      const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
        paid: { bg: 'bg-dash-accent-green/10', text: 'text-dash-accent-green', label: 'مدفوع' },
        partial: { bg: 'bg-dash-accent-orange/10', text: 'text-dash-accent-orange', label: 'جزئي' },
        unpaid: { bg: 'bg-dash-accent-red/10', text: 'text-dash-accent-red', label: 'غير مدفوع' }
      };
      const config = statusConfig[value || ''] || { bg: 'bg-[var(--dash-bg-highlight)]/20', text: 'text-[var(--dash-text-muted)]', label: value || '-' };
      return React.createElement('span', {
        className: `px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`
      }, config.label);
    }
  }
];
