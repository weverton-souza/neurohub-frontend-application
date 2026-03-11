import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'
import MobileHeader from '@/components/layout/MobileHeader'
import ProfessionalModal from '@/components/ProfessionalModal'
import { useSidebar } from '@/hooks/useSidebar'

export default function AppLayout() {
  const { isCollapsed, toggle, isMobile, isMobileOpen, openMobile, closeMobile } = useSidebar()
  const [showProfessionalModal, setShowProfessionalModal] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={toggle}
        onOpenProfessionalModal={() => setShowProfessionalModal(true)}
        isMobile={isMobile}
        isMobileOpen={isMobileOpen}
        onCloseMobile={closeMobile}
      />

      {isMobile && <MobileHeader onOpenMenu={openMobile} />}

      <div
        className={`transition-all duration-300 ease-in-out ${
          isMobile ? 'ml-0 pt-14' : isCollapsed ? 'ml-16' : 'ml-60'
        }`}
      >
        <Outlet />
      </div>

      <ProfessionalModal
        isOpen={showProfessionalModal}
        onClose={() => setShowProfessionalModal(false)}
      />
    </div>
  )
}
