import { useState, useCallback } from "react";

export interface NotificationItem {
  id: string;
  actionLabel?: string;
  onAction?: () => unknown;
  durationMs?: number;
}

export type AddNotificationInput = Omit<NotificationItem, "id">;

export function useNotifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);

  const add = useCallback((input: AddNotificationInput) => {
    const item: NotificationItem = {
      ...input,
      id: crypto.randomUUID(),
      durationMs: input.durationMs ?? 7000,
    };
    setItems((prev) => [...prev, item]);
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return { items, add, remove };
}
