'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import TopHeader from './TopHeader'

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
  showSearch?: boolean
  actions?: React.ReactNode
  showSidebar?: boolean
  showTopHeader?: boolean
  showTopBar?: boolean
}

export default function DashboardLayout({ 
  children, 
  title, 
  showSearch = true, 
  actions,
  showSidebar = true,
  showTopHeader = true,
  showTopBar = true
}: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  return (
    <div className="min-h-screen bg-dash-base">
      {showTopHeader && (
        <TopHeader onMenuClick={toggleSidebar} isMenuOpen={isSidebarOpen} />
      )}
      
      {showSidebar && (
        <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />
      )}
      
      <div className={showTopHeader ? "pt-12" : ""}>
        {showTopBar && (
          <TopBar title={title} showSearch={showSearch} actions={actions} />
        )}
        
        <main className="p-0">
          {children}
        </main>
      </div>
    </div>
  )
}