import { createContext, useContext } from "react";
import type { ToastType } from "@/hooks/useToast";

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useShowToast(): (message: string, type?: ToastType) => void {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useShowToast must be used within RootLayout");
  return ctx.showToast;
}
