import { createContext, useContext } from "react";
import type { ToastType, ToastOptions } from "@/hooks/useToast";

type ShowToast = (message: string, typeOrOptions?: ToastType | ToastOptions) => void;

interface ToastContextValue {
  showToast: ShowToast;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useShowToast(): ShowToast {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useShowToast must be used within RootLayout");
  return ctx.showToast;
}
