'use client';

import React from 'react';

export const getLowStockTableColumns = (formatPrice: (value: number) => string) => [
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
    id: 'current_stock',
    header: 'المخزون الحالي',
    accessor: 'current_stock',
    width: 120,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-dash-accent-red font-medium' }, value || 0)
  },
  {
    id: 'min_stock',
    header: 'الحد الأدنى',
    accessor: 'min_stock',
    width: 100,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, value || 0)
  },
  {
    id: 'deficit',
    header: 'العجز',
    accessor: 'deficit',
    width: 90,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-dash-accent-red font-medium' }, value || 0)
  },
  {
    id: 'cost_price',
    header: 'سعر التكلفة',
    accessor: 'cost_price',
    width: 120,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, formatPrice(value || 0))
  },
  {
    id: 'sale_price',
    header: 'سعر البيع',
    accessor: 'sale_price',
    width: 120,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, formatPrice(value || 0))
  }
];

export const getInventoryValuationTableColumns = (formatPrice: (value: number) => string) => [
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
    id: 'barcode',
    header: 'الباركود',
    accessor: 'barcode',
    width: 130,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)] font-mono' }, value || '-')
  },
  {
    id: 'current_stock',
    header: 'المخزون',
    accessor: 'current_stock',
    width: 100,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-dash-accent-blue font-medium' }, value || 0)
  },
  {
    id: 'cost_price',
    header: 'سعر التكلفة',
    accessor: 'cost_price',
    width: 120,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, formatPrice(value || 0))
  },
  {
    id: 'sale_price',
    header: 'سعر البيع',
    accessor: 'sale_price',
    width: 120,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, formatPrice(value || 0))
  },
  {
    id: 'cost_value',
    header: 'قيمة التكلفة',
    accessor: 'cost_value',
    width: 130,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-dash-accent-green font-medium' }, formatPrice(value || 0))
  },
  {
    id: 'retail_value',
    header: 'قيمة البيع',
    accessor: 'retail_value',
    width: 130,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-dash-accent-blue font-medium' }, formatPrice(value || 0))
  }
];
