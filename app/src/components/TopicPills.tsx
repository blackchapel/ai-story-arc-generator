import React, { memo, useCallback } from 'react'
import type { TopicFilter } from '@/types'
import { cn } from '@/utils/cn'

interface TopicPillsProps {
  filters: TopicFilter[]
  activeId: string
  onSelect: (id: string) => void
}

export const TopicPills = memo<TopicPillsProps>(({ filters, activeId, onSelect }) => {
  return (
    <section
      className="flex-shrink-0 border-b border-[#EBEBEB] py-[6px]"
      aria-label="Topic filters"
    >
      <div
        className="flex gap-[7px] overflow-x-auto px-[18px] py-[6px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="list"
      >
        {filters.map((filter) => {
          const isActive = filter.id === activeId
          return (
            <button
              key={filter.id}
              role="listitem"
              onClick={() => onSelect(filter.id)}
              className={cn(
                'flex h-8 flex-shrink-0 cursor-pointer items-center gap-[5px] rounded-full border px-[13px] text-[12px] font-semibold transition-all duration-150',
                isActive
                  ? 'border-transparent text-white shadow-[0_2px_10px_rgba(99,102,241,0.28)]'
                  : 'border-[#EBEBEB] bg-[#F5F5F5] text-[#0C0C0C] active:bg-[#EDEDED]',
              )}
              style={
                isActive
                  ? {
                      background:
                        'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                    }
                  : undefined
              }
              aria-pressed={isActive}
            >
              <span aria-hidden="true" className="text-[13px]">
                {filter.emoji}
              </span>
              {filter.label}
            </button>
          )
        })}
      </div>
    </section>
  )
})

TopicPills.displayName = 'TopicPills'
