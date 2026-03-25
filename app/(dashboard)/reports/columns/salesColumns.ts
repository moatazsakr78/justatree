'use client';

import React from 'react';

export const getProductsTableColumns = (formatPrice: (value: number) => string) => [
  {
    id: 'index',
    header: '#',
    accessor: '#',
    width: 60,
    visible: true
  },
  {
    id: 'category_name',
    header: 'المجموعة',
    accessor: 'category_name',
    width: 120,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-primary)] font-medium' }, value || 'غير محدد')
  },
  {
    id: 'product_name',
    header: 'اسم المنتج',
    accessor: 'product_name',
    width: 200,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-primary)] font-medium' }, value || 'غير محدد')
  },
  {
    id: 'total_quantity_sold',
    header: 'الكمية',
    accessor: 'total_quantity_sold',
    width: 80,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, value || 0)
  },
  {
    id: 'branch_name',
    header: 'الفرع',
    accessor: 'branch_name',
    width: 100,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, value || 'جميع الفروع')
  },
  {
    id: 'total_sales_amount',
    header: 'الاجمالي',
    accessor: 'total_sales_amount',
    width: 120,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-[var(--dash-text-primary)] font-medium' }, formatPrice(value || 0))
  },
  {
    id: 'current_sale_price',
    header: 'سعر البيع',
    accessor: 'current_sale_price',
    width: 100,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, formatPrice(parseFloat(value || '0')))
  },
  {
    id: 'total_sale_price',
    header: 'إجمالي سعر البيع',
    accessor: 'total_sale_price',
    width: 150,
    visible: true,
    render: (_value: any, item: any) => {
      const price = parseFloat(item?.current_sale_price || '0');
      const quantity = item?.priceBreakdown?.get(price) || 0;
      const total = quantity * price;
      return React.createElement('span', { className: 'text-[var(--dash-text-primary)]' },
        React.createElement('span', { className: 'text-dash-accent-blue' }, quantity),
        React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, '*'),
        React.createElement('span', { className: 'text-dash-accent-green' }, price.toFixed(2)),
        React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, ' = '),
        React.createElement('span', { className: 'text-[var(--dash-text-primary)]' }, total.toFixed(2))
      );
    }
  },
  {
    id: 'wholesale_price',
    header: 'سعر الجملة',
    accessor: 'wholesale_price',
    width: 100,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, formatPrice(parseFloat(value || '0')))
  },
  {
    id: 'total_wholesale_price',
    header: 'إجمالي سعر الجملة',
    accessor: 'total_wholesale_price',
    width: 150,
    visible: true,
    render: (_value: any, item: any) => {
      const price = parseFloat(item?.wholesale_price || '0');
      const quantity = item?.priceBreakdown?.get(price) || 0;
      const total = quantity * price;
      return React.createElement('span', { className: 'text-[var(--dash-text-primary)]' },
        React.createElement('span', { className: 'text-dash-accent-blue' }, quantity),
        React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, '*'),
        React.createElement('span', { className: 'text-dash-accent-green' }, price.toFixed(2)),
        React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, ' = '),
        React.createElement('span', { className: 'text-[var(--dash-text-primary)]' }, total.toFixed(2))
      );
    }
  },
  {
    id: 'price1',
    header: 'سعر 1',
    accessor: 'price1',
    width: 80,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, formatPrice(parseFloat(value || '0')))
  },
  {
    id: 'total_price1',
    header: 'إجمالي سعر 1',
    accessor: 'total_price1',
    width: 150,
    visible: true,
    render: (_value: any, item: any) => {
      const price = parseFloat(item?.price1 || '0');
      const quantity = item?.priceBreakdown?.get(price) || 0;
      const total = quantity * price;
      return React.createElement('span', { className: 'text-[var(--dash-text-primary)]' },
        React.createElement('span', { className: 'text-dash-accent-blue' }, quantity),
        React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, '*'),
        React.createElement('span', { className: 'text-dash-accent-green' }, price.toFixed(2)),
        React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, ' = '),
        React.createElement('span', { className: 'text-[var(--dash-text-primary)]' }, total.toFixed(2))
      );
    }
  },
  {
    id: 'price2',
    header: 'سعر 2',
    accessor: 'price2',
    width: 80,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, formatPrice(parseFloat(value || '0')))
  },
  {
    id: 'total_price2',
    header: 'إجمالي سعر 2',
    accessor: 'total_price2',
    width: 150,
    visible: true,
    render: (_value: any, item: any) => {
      const price = parseFloat(item?.price2 || '0');
      const quantity = item?.priceBreakdown?.get(price) || 0;
      const total = quantity * price;
      return React.createElement('span', { className: 'text-[var(--dash-text-primary)]' },
        React.createElement('span', { className: 'text-dash-accent-blue' }, quantity),
        React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, '*'),
        React.createElement('span', { className: 'text-dash-accent-green' }, price.toFixed(2)),
        React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, ' = '),
        React.createElement('span', { className: 'text-[var(--dash-text-primary)]' }, total.toFixed(2))
      );
    }
  },
  {
    id: 'price3',
    header: 'سعر 3',
    accessor: 'price3',
    width: 80,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, formatPrice(parseFloat(value || '0')))
  },
  {
    id: 'total_price3',
    header: 'إجمالي سعر 3',
    accessor: 'total_price3',
    width: 150,
    visible: true,
    render: (_value: any, item: any) => {
      const price = parseFloat(item?.price3 || '0');
      const quantity = item?.priceBreakdown?.get(price) || 0;
      const total = quantity * price;
      return React.createElement('span', { className: 'text-[var(--dash-text-primary)]' },
        React.createElement('span', { className: 'text-dash-accent-blue' }, quantity),
        React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, '*'),
        React.createElement('span', { className: 'text-dash-accent-green' }, price.toFixed(2)),
        React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, ' = '),
        React.createElement('span', { className: 'text-[var(--dash-text-primary)]' }, total.toFixed(2))
      );
    }
  },
  {
    id: 'price4',
    header: 'سعر 4',
    accessor: 'price4',
    width: 80,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, formatPrice(parseFloat(value || '0')))
  },
  {
    id: 'total_price4',
    header: 'إجمالي سعر 4',
    accessor: 'total_price4',
    width: 150,
    visible: true,
    render: (_value: any, item: any) => {
      const price = parseFloat(item?.price4 || '0');
      const quantity = item?.priceBreakdown?.get(price) || 0;
      const total = quantity * price;
      return React.createElement('span', { className: 'text-[var(--dash-text-primary)]' },
        React.createElement('span', { className: 'text-dash-accent-blue' }, quantity),
        React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, '*'),
        React.createElement('span', { className: 'text-dash-accent-green' }, price.toFixed(2)),
        React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, ' = '),
        React.createElement('span', { className: 'text-[var(--dash-text-primary)]' }, total.toFixed(2))
      );
    }
  }
];

export const getCategoriesTableColumns = (formatPrice: (value: number) => string) => [
  {
    id: 'index',
    header: '#',
    accessor: '#',
    width: 60,
    visible: true
  },
  {
    id: 'category_name',
    header: 'اسم التصنيف',
    accessor: 'category_name',
    width: 200,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-primary)] font-medium' }, value || 'غير محدد')
  },
  {
    id: 'total_quantity_sold',
    header: 'الكمية المباعة',
    accessor: 'total_quantity_sold',
    width: 120,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, value || 0)
  },
  {
    id: 'branch_name',
    header: 'الفرع',
    accessor: 'branch_name',
    width: 100,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, value || 'جميع الفروع')
  },
  {
    id: 'total_sales_amount',
    header: 'الاجمالي',
    accessor: 'total_sales_amount',
    width: 120,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-[var(--dash-text-primary)] font-medium' }, formatPrice(value || 0))
  },
  {
    id: 'products_count',
    header: 'عدد المنتجات',
    accessor: 'products_count',
    width: 100,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, value || 0)
  },
  {
    id: 'avg_price',
    header: 'متوسط السعر',
    accessor: 'avg_price',
    width: 100,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, formatPrice(value || 0))
  }
];

export const getCustomersTableColumns = (formatPrice: (value: number) => string) => [
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
    width: 180,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-primary)] font-medium' }, value || 'غير محدد')
  },
  {
    id: 'category',
    header: 'الفئة',
    accessor: 'category',
    width: 100,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, value || 'عام')
  },
  {
    id: 'rank',
    header: 'الرتبة',
    accessor: 'rank',
    width: 100,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, value || 'برونزي')
  },
  {
    id: 'phone',
    header: 'رقم الهاتف',
    accessor: 'phone',
    width: 120,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)] font-mono' }, value || 'غير محدد')
  },
  {
    id: 'backup_phone',
    header: 'الاحتياطي',
    accessor: 'backup_phone',
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
    id: 'created_at',
    header: 'تاريخ الانشاء',
    accessor: 'created_at',
    width: 100,
    visible: true,
    render: (value: string) => {
      if (!value) return React.createElement('span', { className: 'text-[var(--dash-text-muted)]' }, 'غير محدد');
      const date = new Date(value);
      return React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, date.toLocaleDateString('en-GB'));
    }
  },
  {
    id: 'invoice_count',
    header: 'عدد الفواتير',
    accessor: 'invoice_count',
    width: 100,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-dash-accent-blue font-medium' }, value || 0)
  },
  {
    id: 'total_amount',
    header: 'الإجمالي',
    accessor: 'total_amount',
    width: 120,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-dash-accent-green font-medium' }, formatPrice(value || 0))
  },
  {
    id: 'total_profit',
    header: 'الربح',
    accessor: 'total_profit',
    width: 120,
    visible: true,
    render: (value: number) => {
      const profit = value || 0;
      const colorClass = profit >= 0 ? 'text-dash-accent-green' : 'text-dash-accent-red';
      return React.createElement('span', { className: `${colorClass} font-medium` }, formatPrice(profit));
    }
  }
];

export const getUsersTableColumns = (formatPrice: (value: number) => string) => [
  {
    id: 'index',
    header: '#',
    accessor: '#',
    width: 60,
    visible: true
  },
  {
    id: 'user_name',
    header: 'اسم المستخدم',
    accessor: 'user_name',
    width: 180,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-primary)] font-medium' }, value || '-')
  },
  {
    id: 'role',
    header: 'الدور',
    accessor: 'role',
    width: 120,
    visible: true,
    render: (value: string) => React.createElement('span', { className: 'text-[var(--dash-text-secondary)]' }, value || '-')
  },
  {
    id: 'total_invoices',
    header: 'إجمالي الفواتير',
    accessor: 'total_invoices',
    width: 120,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-dash-accent-blue font-medium' }, (value || 0).toLocaleString())
  },
  {
    id: 'total_amount',
    header: 'إجمالي المبلغ',
    accessor: 'total_amount',
    width: 140,
    visible: true,
    render: (value: number) => React.createElement('span', { className: 'text-[var(--dash-text-primary)] font-medium' }, formatPrice(value || 0))
  },
  {
    id: 'total_profit',
    header: 'الربح',
    accessor: 'total_profit',
    width: 140,
    visible: true,
    render: (value: number) => {
      const profit = value || 0;
      const colorClass = profit >= 0 ? 'text-dash-accent-green' : 'text-dash-accent-red';
      return React.createElement('span', { className: `${colorClass} font-medium` }, formatPrice(profit));
    }
  }
];
