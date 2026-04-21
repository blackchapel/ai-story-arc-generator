import { createContext, useContext } from "react";
import type { AddNotificationInput } from "@/hooks/useNotifications";

interface NotificationContextValue {
  addNotification: (input: AddNotificationInput) => void;
}

export const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useAddNotification(): (input: AddNotificationInput) => void {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useAddNotification must be used within RootLayout");
  return ctx.addNotification;
}
