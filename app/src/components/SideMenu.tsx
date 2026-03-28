import React, { memo, useEffect, useCallback } from 'react'

interface SideMenuProps {
  isOpen: boolean
  onClose: () => void
}

const MENU_ITEMS = [
  { icon: '🏠', label: 'Home',       active: true  },
  { icon: '🔖', label: 'Bookmarks',  active: false },
  { icon: '🔔', label: 'Alerts',     active: false },
  { icon: '📡', label: 'Following',  active: false },
  { icon: '⚙️', label: 'Settings',   active: false },
] as const

export const SideMenu = memo<SideMenuProps>(({ isOpen, onClose }) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose],
  )

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleBackdropClick}
        aria-hidden="true"
        className="fixed inset-0 z-40 transition-all duration-300"
        style={{
          background: isOpen ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0)',
          backdropFilter: isOpen ? 'blur(4px)' : 'blur(0px)',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      />

      {/* Drawer */}
      <nav
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className="fixed left-0 top-0 z-50 flex h-full w-[280px] flex-col bg-white pt-safe shadow-2xl"
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          maxWidth: '390px',
        }}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid #EBEBEB' }}
        >
          <span className="select-none font-logo text-[28px] font-black leading-none tracking-[-2px] text-[#0C0C0C]">
            arc<span className="text-[#F5A623]">.</span>
          </span>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-[#F5F5F5] text-[#0C0C0C] transition-colors duration-150 active:bg-[#EDEDED]"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Nav items */}
        <ul className="flex flex-col gap-1 px-3 pt-3" role="list">
          {MENU_ITEMS.map((item) => (
            <li key={item.label} role="listitem">
              <button
                className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border-none px-4 py-3 text-left text-[15px] font-semibold transition-colors duration-150 ${
                  item.active
                    ? 'bg-[rgba(99,102,241,0.09)] text-[#6366F1]'
                    : 'bg-transparent text-[#0C0C0C] hover:bg-[#F5F5F5] active:bg-[#EDEDED]'
                }`}
              >
                <span className="text-[18px]" aria-hidden="true">{item.icon}</span>
                {item.label}
                {item.active && (
                  <span
                    className="ml-auto h-1.5 w-1.5 rounded-full"
                    style={{ background: '#6366F1' }}
                    aria-hidden="true"
                  />
                )}
              </button>
            </li>
          ))}
        </ul>

        {/* Footer */}
        <div className="mt-auto px-6 pb-8 pt-4" style={{ borderTop: '1px solid #EBEBEB' }}>
          <p className="text-[11px] text-[#8C8C8C]">arc. news · v1.0.0</p>
          <p className="mt-1 text-[11px] text-[#8C8C8C]">Clean news for the curious mind.</p>
        </div>
      </nav>
    </>
  )
})

SideMenu.displayName = 'SideMenu'
