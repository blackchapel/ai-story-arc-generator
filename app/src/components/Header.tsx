import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { deleteAccount } from "@/apis";

interface HeaderProps {
  onMenuClick: () => void;
  onProfileClick: () => void;
}

// ── Spinner ───────────────────────────────────────────────────────────────────

const Spinner = ({ color = "currentColor" }: { color?: string }) => (
  <svg
    className="animate-spin"
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    aria-hidden="true"
  >
    <circle
      cx="7"
      cy="7"
      r="5.5"
      stroke={color}
      strokeOpacity="0.3"
      strokeWidth="2"
    />
    <path
      d="M7 1.5a5.5 5.5 0 0 1 5.5 5.5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export const Header = memo<HeaderProps>(({ onMenuClick, onProfileClick }) => {
  const { user, isLoading, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Delete account modal state ────────────────────────────────────────────
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const toggleDropdown = useCallback(() => {
    setDropdownOpen((p) => !p);
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
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

  const handleOpenDeleteModal = useCallback(() => {
    setDropdownOpen(false);
    setDeleteError(null);
    setDeleteModalOpen(true);
  }, []);

  const handleCloseDeleteModal = useCallback(() => {
    if (deleteLoading) return;
    setDeleteModalOpen(false);
    setDeleteError(null);
  }, [deleteLoading]);

  const handleConfirmDelete = useCallback(async () => {
    if (deleteLoading) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      await logout();
      setDeleteModalOpen(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      setDeleteError(message);
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteLoading, logout]);

  const displayName = user ? (user.email.split("@")[0] ?? user.email) : "";
  const initial = displayName[0]?.toUpperCase() ?? "";

  return (
    <header
      className="relative z-30 flex h-[58px] flex-shrink-0 items-center justify-between bg-white px-[18px]"
      style={{ borderBottom: "1px solid #EBEBEB" }}
    >
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] opacity-70"
        style={{
          background:
            "linear-gradient(90deg, #6366F1 0%, #EC4899 30%, #F5A623 55%, #10B981 80%, #0EA5E9 100%)",
        }}
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
        {isLoading ? (
          <div
            className="h-[34px] w-[34px] flex-shrink-0 rounded-full bg-[#EBEBEB]"
            style={{ animation: "skeletonPulse 1.4s ease-in-out infinite" }}
            aria-hidden="true"
          />
        ) : user ? (
          <button
            onClick={toggleDropdown}
            className="flex h-[34px] w-[34px] flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full transition-opacity active:opacity-70"
            style={{
              background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
            }}
            aria-label={`${displayName} — profile`}
            aria-expanded={dropdownOpen}
          >
            <span className="text-[14px] font-bold text-white">{initial}</span>
          </button>
        ) : (
          <button
            onClick={onProfileClick}
            className="flex h-[30px] cursor-pointer items-center gap-1.5 rounded-full border-none px-3 text-[12px] font-bold text-white transition-opacity active:opacity-80"
            style={{
              background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
              boxShadow: "0 2px 10px rgba(99,102,241,0.32)",
            }}
            aria-label="Sign in"
          >
            Sign in
          </button>
        )}

        {dropdownOpen && user && (
          <div
            className="absolute right-0 top-full z-50 mt-2 w-[192px] overflow-hidden rounded-xl border border-[#EBEBEB] bg-white shadow-xl"
            style={{
              animation: "dropIn 0.18s cubic-bezier(0.34,1.56,0.64,1) both",
            }}
          >
            <div className="px-4 py-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#ABABAB]">
                Signed in as
              </p>
              <p className="mt-[2px] truncate text-[13px] font-bold text-[#6366F1]">
                {user.email}
              </p>
            </div>
            <div className="border-t border-[#F5F5F5]" />
            <button
              onClick={handleLogout}
              className="flex w-full cursor-pointer items-center gap-2 border-none bg-transparent px-4 py-[11px] text-left text-[13px] font-semibold text-[#EF4444] transition-colors active:bg-[#FFF5F5]"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M5 13H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h3M9.5 10.5 13 7l-3.5-3.5M5 7h8"
                  stroke="#EF4444"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Sign out
            </button>
            <div className="border-t border-[#F5F5F5]" />
            <button
              onClick={handleOpenDeleteModal}
              className="flex w-full cursor-pointer items-center gap-2 border-none bg-transparent px-4 py-[11px] text-left text-[13px] font-semibold text-[#8C8C8C] transition-colors active:bg-[#FFF5F5] hover:text-[#EF4444]"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2 3.5h10M5.5 3.5V2.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M5.5 6.5v3.5M8.5 6.5v3.5M3 3.5l.7 7a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9l.7-7"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Delete account
            </button>
          </div>
        )}
      </div>

      {/* ── Delete account confirmation sheet ────────────────────────────────── */}
      {deleteModalOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30"
            style={{ animation: "fadeIn 0.2s ease both" }}
            onClick={handleCloseDeleteModal}
            aria-hidden="true"
          />

          {/* Bottom sheet panel */}
          <div
            className="fixed left-0 right-0 z-50 rounded-t-3xl bg-white px-5 pt-4"
            style={{
              bottom: 0,
              paddingBottom: "calc(28px + env(safe-area-inset-bottom, 0px))",
              animation: "sheetUp 0.3s cubic-bezier(0.34,1.06,0.64,1) both",
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Delete account"
          >
            {/* Drag handle */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#EBEBEB]" />

            {/* Icon */}
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(239,68,68,0.10)] text-[#EF4444]">
              <svg
                width="18"
                height="18"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2.5 4.5h11M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M6.5 7.5v4M9.5 7.5v4M3.5 4.5l.8 8a1 1 0 0 0 1 .9h5.4a1 1 0 0 0 1-.9l.8-8"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h2 className="mt-3 text-[17px] font-bold text-[#0C0C0C]">
              Delete account?
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#8C8C8C]">
              This will permanently delete your account and all your story arcs.
              Shared links will stop working immediately. This action cannot be
              undone.
            </p>

            {/* Inline error */}
            {deleteError && (
              <p className="mt-3 rounded-xl bg-[rgba(239,68,68,0.07)] px-3.5 py-2.5 text-[12.5px] font-medium text-[#EF4444]">
                {deleteError}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-2.5">
              <button
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-none py-[14px] text-[15px] font-bold text-white transition-opacity active:opacity-80 disabled:opacity-70"
                style={{
                  background: "linear-gradient(135deg, #EF4444, #DC2626)",
                  boxShadow: "0 4px 16px rgba(239,68,68,0.28)",
                }}
              >
                {deleteLoading ? (
                  <Spinner color="rgba(255,255,255,0.8)" />
                ) : null}
                Yes, delete account
              </button>
              <button
                onClick={handleCloseDeleteModal}
                disabled={deleteLoading}
                className="flex w-full cursor-pointer items-center justify-center rounded-2xl border-none bg-[#F5F5F5] py-[14px] text-[15px] font-semibold text-[#0C0C0C] transition-colors active:bg-[#EDEDED] disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes dropIn{from{opacity:0;transform:translateY(-6px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes skeletonPulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
      `}</style>
    </header>
  );
});
Header.displayName = "Header";
