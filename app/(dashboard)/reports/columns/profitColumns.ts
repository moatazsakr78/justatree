'use client';

import React from 'react';

export const getProfitMarginTableColumns = (formatPrice: (value: number) => string) => [
  {
    id: 'index',
    header: '#',
    accessor: '#',
    width: 60,
    visible: true
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
    width: 90,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-dash-accent-blue font-medium' }, value || 0)
  },
  {
    id: 'cost_price',
    header: 'التكلفة',
    accessor: 'cost_price',
    width: 120,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, formatPrice(value || 0))
  },
  {
    id: 'total_amount',
    header: 'الإجمالي',
    accessor: 'total_amount',
    width: 130,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-[var(--dash-text-primary)] font-medium' }, formatPrice(value || 0))
  },
  {
    id: 'profit',
    header: 'الربح',
    accessor: 'profit',
    width: 130,
    visible: true,
    render: (value: number) => {
      const profit = value || 0;
      const colorClass = profit >= 0 ? 'text-dash-accent-green' : 'text-dash-accent-red';
      return React.createElement('span', { className: `${colorClass} font-medium` }, formatPrice(profit));
    }
  },
  {
    id: 'margin',
    header: 'هامش الربح %',
    accessor: 'margin',
    width: 120,
    visible: true,
    render: (value: number) => {
      const margin = value || 0;
      const colorClass = margin >= 20 ? 'text-dash-accent-green' : margin >= 10 ? 'text-dash-accent-orange' : 'text-dash-accent-red';
      return React.createElement('span', { className: `${colorClass} font-medium` }, `${margin.toFixed(2)}%`);
    }
  }
];
