'use client'

import { useState } from 'react'

interface Supplier {
  id: number
  name: string
  phone: string
  email: string
  address: string
  city: string
  accountBalance: number
  createdAt: string
}

interface SupplierTableProps {
  showActions?: boolean
}

const mockSuppliers: Supplier[] = [
  {
    id: 1,
    name: 'مورد اختبار',
    phone: '0509876543',
    email: 'مورد',
    address: '',
    city: 'bronze',
    accountBalance: 0,
    createdAt: 'Jul 9, 2025'
  }
]

export default function SupplierTable({ showActions = false }: SupplierTableProps) {
  const [selectedRows, setSelectedRows] = useState<number[]>([])

  const toggleRowSelection = (id: number) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    )
  }

  const toggleAllSelection = () => {
    setSelectedRows(prev => 
      prev.length === mockSuppliers.length ? [] : mockSuppliers.map(s => s.id)
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-right">
        <thead className="bg-[var(--dash-table-header-bg)] text-[var(--dash-text-secondary)]">
          <tr>
            <th className="p-3 text-center">
              <input
                type="checkbox"
                checked={selectedRows.length === mockSuppliers.length}
                onChange={toggleAllSelection}
                className="w-4 h-4 text-[#5DADE2] bg-[var(--dash-bg-raised)] border-[var(--dash-border-default)] rounded focus:ring-[#5DADE2]"
              />
            </th>
            <th className="p-3 text-right font-medium">#</th>
            <th className="p-3 text-right font-medium">الاسم</th>
            <th className="p-3 text-right font-medium">الفئة</th>
            <th className="p-3 text-right font-medium">الحساب</th>
            <th className="p-3 text-right font-medium">الراتب</th>
            <th className="p-3 text-right font-medium">رقم الهاتف</th>
            <th className="p-3 text-right font-medium">المدينة</th>
            <th className="p-3 text-right font-medium">العنوان</th>
            <th className="p-3 text-right font-medium">تاريخ الإنشاء</th>
          </tr>
        </thead>
        <tbody className="bg-pos-darker divide-y divide-[var(--dash-border-subtle)]">
          {mockSuppliers.map((supplier) => (
            <tr 
              key={supplier.id}
              className={`hover:bg-[var(--dash-bg-overlay)] transition-colors ${
                selectedRows.includes(supplier.id) ? 'bg-[var(--dash-accent-blue-subtle)]' : ''
              }`}
            >
              <td className="p-3 text-center">
                <input
                  type="checkbox"
                  checked={selectedRows.includes(supplier.id)}
                  onChange={() => toggleRowSelection(supplier.id)}
                  className="w-4 h-4 text-[#5DADE2] bg-[var(--dash-bg-raised)] border-[var(--dash-border-default)] rounded focus:ring-[#5DADE2]"
                />
              </td>
              <td className="p-3 text-[var(--dash-text-primary)] font-medium">{supplier.id}</td>
              <td className="p-3 text-[var(--dash-text-primary)] font-medium">{supplier.name}</td>
              <td className="p-3 text-[var(--dash-text-primary)]">{supplier.email}</td>
              <td className="p-3 text-[var(--dash-text-primary)]">{supplier.accountBalance}</td>
              <td className="p-3 text-[var(--dash-text-primary)]">{supplier.city}</td>
              <td className="p-3 text-[var(--dash-text-primary)]">{supplier.phone}</td>
              <td className="p-3 text-[var(--dash-text-primary)]">{supplier.city}</td>
              <td className="p-3 text-[var(--dash-text-primary)]">{supplier.address || '-'}</td>
              <td className="p-3 text-[var(--dash-text-muted)]">{supplier.createdAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}