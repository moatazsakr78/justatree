'use client'

import { CurrentBranchProvider } from '@/lib/contexts/CurrentBranchContext'
import { PermissionsProvider } from '@/lib/contexts/PermissionsContext'
import { BackgroundProductProvider } from '@/lib/contexts/BackgroundProductContext'
import { EditOrderProvider } from '@/lib/contexts/EditOrderContext'
import { AutoSelectInputProvider } from '@/app/components/AutoSelectInputProvider'

export function DashboardProviders({ children }: { children: React.ReactNode }) {
  return (
    <CurrentBranchProvider>
      <PermissionsProvider>
        <BackgroundProductProvider>
          <EditOrderProvider>
            <AutoSelectInputProvider>
              {children}
            </AutoSelectInputProvider>
          </EditOrderProvider>
        </BackgroundProductProvider>
      </PermissionsProvider>
    </CurrentBranchProvider>
  )
}
