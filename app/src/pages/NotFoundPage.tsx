import { useNavigate } from "react-router";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-white px-6 text-center">
      <p className="select-none font-logo text-[32px] font-black leading-none tracking-[-1.5px] text-[#0C0C0C]">
        arc<span style={{ color: "#F5A623" }}>.</span>
      </p>

      <p className="mt-6 text-[64px] font-black leading-none tracking-tight text-[#0C0C0C]">
        404
      </p>

      <p className="mt-3 text-[18px] font-semibold text-[#0C0C0C]">Page not found</p>
      <p className="mt-2 max-w-[280px] text-[13.5px] leading-relaxed text-[#8C8C8C]">
        This page doesn't exist or may have been moved.
      </p>

      <button
        onClick={() => navigate("/", { replace: true })}
        className="mt-8 cursor-pointer rounded-2xl border-none px-6 py-3 text-[14px] font-bold text-white transition-opacity active:opacity-80"
        style={{
          background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
          boxShadow: "0 2px 12px rgba(99,102,241,0.30)",
        }}
      >
        Back to home
      </button>
    </div>
  );
}
