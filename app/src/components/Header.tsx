import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface HeaderProps {
  onMenuClick: () => void;
  onProfileClick: () => void;
}

export const Header = memo<HeaderProps>(({ onMenuClick, onProfileClick }) => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = useCallback(() => {
    if (!user) { onProfileClick(); return; }
    setDropdownOpen((p) => !p);
  }, [user, onProfileClick]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  const handleLogout = useCallback(async () => {
    setDropdownOpen(false);
    await logout();
  }, [logout]);

  const displayName = user ? (user.email.split("@")[0] ?? user.email) : "";
  const initial = displayName[0]?.toUpperCase() ?? "";

  return (
    <header
      className="relative z-30 flex h-[58px] flex-shrink-0 items-center justify-between bg-white px-[18px]"
      style={{ borderBottom: "1px solid #EBEBEB" }}
    >
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] opacity-70"
        style={{ background: "linear-gradient(90deg, #6366F1 0%, #EC4899 30%, #F5A623 55%, #10B981 80%, #0EA5E9 100%)" }}
        aria-hidden="true"
      />

      <button
        onClick={onMenuClick}
        className="flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-[#0C0C0C] transition-colors active:bg-[#F5F5F5]"
        aria-label="Open menu"
      >
        <div className="flex flex-col gap-[4px]" aria-hidden="true">
          <span className="block h-[1.75px] w-[20px] rounded-sm bg-[#0C0C0C]" />
          <span className="block h-[1.75px] w-[14px] rounded-sm bg-[#0C0C0C]" />
          <span className="block h-[1.75px] w-[20px] rounded-sm bg-[#0C0C0C]" />
        </div>
      </button>

      <span
        className="absolute left-1/2 -translate-x-1/2 select-none font-logo text-[32px] font-black leading-none tracking-[-2px] text-[#0C0C0C]"
        aria-label="arc."
      >
        arc<span className="text-[#F5A623]">.</span>
      </span>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={toggleDropdown}
          className="flex h-[34px] w-[34px] flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full transition-opacity active:opacity-70"
          style={user
            ? { background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)" }
            : { border: "2px solid transparent", background: "linear-gradient(white,white) padding-box, linear-gradient(135deg,#F5A623 0%,#EC4899 100%) border-box" }}
          aria-label={user ? `${displayName} — profile` : "Sign in"}
          aria-expanded={dropdownOpen}
        >
          {user ? (
            <span className="text-[14px] font-bold text-white">{initial}</span>
          ) : (
            <svg width="18" height="19" viewBox="0 0 18 19" fill="none" aria-hidden="true">
              <circle cx="9" cy="6.5" r="3.75" fill="#ABABAB"/>
              <path d="M1.5 18c0-4.142 3.358-7.5 7.5-7.5s7.5 3.358 7.5 7.5" stroke="#ABABAB" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          )}
        </button>

        {dropdownOpen && user && (
          <div
            className="absolute right-0 top-full z-50 mt-2 w-[192px] overflow-hidden rounded-xl border border-[#EBEBEB] bg-white shadow-xl"
            style={{ animation: "dropIn 0.18s cubic-bezier(0.34,1.56,0.64,1) both" }}
          >
            <div className="px-4 py-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#ABABAB]">Signed in as</p>
              <p className="mt-[2px] truncate text-[13px] font-bold text-[#6366F1]">{user.email}</p>
            </div>
            <div className="border-t border-[#F5F5F5]" />
            <button
              onClick={handleLogout}
              className="flex w-full cursor-pointer items-center gap-2 border-none bg-transparent px-4 py-[11px] text-left text-[13px] font-semibold text-[#EF4444] transition-colors active:bg-[#FFF5F5]"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M5 13H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h3M9.5 10.5 13 7l-3.5-3.5M5 7h8" stroke="#EF4444" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Sign out
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes dropIn{from{opacity:0;transform:translateY(-6px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
    </header>
  );
});
Header.displayName = "Header";
