import React, { memo, useCallback } from 'react'
import type { Story } from '@/types'

interface StoryCardProps {
  story: Story
  onClick: (id: string) => void
}

const StoryCard = memo<StoryCardProps>(({ story, onClick }) => {
  const handleClick = useCallback(() => onClick(story.id), [onClick, story.id])

  return (
    <button
      onClick={handleClick}
      className="group relative h-[144px] w-[86px] flex-shrink-0 cursor-pointer overflow-hidden rounded-lg border-none p-0 transition-transform duration-[180ms] active:scale-[0.94]"
      style={{ background: story.gradient }}
      aria-label={`${story.label} story`}
    >
      {/* Vignette overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Avatar ring */}
      <div
        className="absolute left-2 top-2 flex h-[30px] w-[30px] items-center justify-center rounded-full text-[13px]"
        style={{
          border: '2.5px solid #F5A623',
          background: 'rgba(255,255,255,0.25)',
          backdropFilter: 'blur(4px)',
        }}
        aria-hidden="true"
      >
        {story.emoji}
      </div>

      {/* Label */}
      <span className="absolute bottom-2 left-[7px] right-[7px] text-left text-[10px] font-bold leading-[1.3] text-white">
        {story.label}
      </span>
    </button>
  )
})

StoryCard.displayName = 'StoryCard'

interface StoriesRowProps {
  stories: Story[]
  onStoryClick: (id: string) => void
  onAddStory: () => void
}

export const StoriesRow = memo<StoriesRowProps>(({ stories, onStoryClick, onAddStory }) => {
  return (
    <section
      className="flex-shrink-0 border-b border-[#EBEBEB] pb-3 pt-[14px]"
      aria-label="Stories"
    >
      {/* Section label */}
      <p
        className="pb-[10px] pl-[18px] text-[10.5px] font-bold uppercase tracking-[0.09em]"
        style={{
          background: 'linear-gradient(90deg, #6366F1 0%, #EC4899 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        Following
      </p>

      {/* Scrollable row */}
      <div
        className="flex gap-2 overflow-x-auto px-[18px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: 'touch' }}
        role="list"
      >
        {/* Add Story tile */}
        <button
          onClick={onAddStory}
          className="flex h-[144px] w-[86px] flex-shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-none transition-colors duration-150 active:opacity-80"
          style={{
            border: '1.5px dashed rgba(245,166,35,0.45)',
            background: 'rgba(245,166,35,0.09)',
          }}
          aria-label="Add your story"
          role="listitem"
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{
              background: 'linear-gradient(135deg, #F5A623 0%, #EC4899 100%)',
            }}
            aria-hidden="true"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M7 1.5v11M1.5 7h11" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-center text-[9.5px] font-bold leading-[1.3] text-[#F5A623]">
            Your
            <br />
            Story
          </span>
        </button>

        {/* Story cards */}
        {stories.map((story) => (
          <div key={story.id} role="listitem">
            <StoryCard story={story} onClick={onStoryClick} />
          </div>
        ))}
      </div>
    </section>
  )
})

StoriesRow.displayName = 'StoriesRow'
