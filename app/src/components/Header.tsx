import { memo } from "react";

interface HeaderProps {
  onMenuClick: () => void;
  onProfileClick: () => void;
}

export const Header = memo<HeaderProps>(({ onMenuClick, onProfileClick }) => {
  return (
    <header
      className="relative z-30 flex h-[58px] flex-shrink-0 items-center justify-between bg-white px-[18px]"
      style={{ borderBottom: "1px solid #EBEBEB" }}
    >
      {/* Rainbow underline */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] opacity-70"
        style={{
          background:
            "linear-gradient(90deg, #6366F1 0%, #EC4899 30%, #F5A623 55%, #10B981 80%, #0EA5E9 100%)",
        }}
        aria-hidden="true"
      />

      {/* Hamburger menu */}
      <button
        onClick={onMenuClick}
        className="flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-[#0C0C0C] transition-colors duration-150 active:bg-[#F5F5F5]"
        aria-label="Open menu"
      >
        <div className="flex flex-col gap-[4px]" aria-hidden="true">
          <span className="block h-[1.75px] w-[20px] rounded-sm bg-[#0C0C0C]" />
          <span className="block h-[1.75px] w-[14px] rounded-sm bg-[#0C0C0C]" />
          <span className="block h-[1.75px] w-[20px] rounded-sm bg-[#0C0C0C]" />
        </div>
      </button>

      {/* Logo — absolutely centred */}
      <span
        className="absolute left-1/2 -translate-x-1/2 select-none font-logo text-[32px] font-black leading-none tracking-[-2px] text-[#0C0C0C]"
        aria-label="arc."
      >
        arc<span className="text-[#F5A623]">.</span>
      </span>

      {/* Avatar */}
      <button
        onClick={onProfileClick}
        className="flex h-[34px] w-[34px] flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full transition-opacity duration-150 active:opacity-70"
        style={{
          border: "2px solid transparent",
          background:
            "linear-gradient(white, white) padding-box, linear-gradient(135deg, #F5A623 0%, #EC4899 100%) border-box",
        }}
        aria-label="Your profile"
      >
        <svg
          width="18"
          height="19"
          viewBox="0 0 18 19"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="9" cy="6.5" r="3.75" fill="#ABABAB" />
          <path
            d="M1.5 18c0-4.142 3.358-7.5 7.5-7.5s7.5 3.358 7.5 7.5"
            stroke="#ABABAB"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </header>
  );
});

Header.displayName = "Header";
