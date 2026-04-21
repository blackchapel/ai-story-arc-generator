import { memo } from "react";
import type { NotificationItem } from "@/hooks/useNotifications";
import { NotificationCard } from "./NotificationCard";

interface NotificationStackProps {
  items: NotificationItem[];
  onDismiss: (id: string) => void;
}

export const NotificationStack = memo<NotificationStackProps>(({ items, onDismiss }) => {
  if (items.length === 0) return null;

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[150] flex flex-col gap-2"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      >
        {items.map((item) => (
          <NotificationCard
            key={item.id}
            item={item}
            onDismiss={() => onDismiss(item.id)}
          />
        ))}
      </div>

      <style>{`
        @keyframes notifIn {
          from { opacity: 0; transform: translateY(-100%) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)      scale(1);   }
        }
        @keyframes notifOut {
          from { opacity: 1; transform: translateY(0)       scale(1);    }
          to   { opacity: 0; transform: translateY(-100%)   scale(0.96); }
        }
        @keyframes notifProgress {
          from { width: 100%; }
          to   { width: 0%;   }
        }
      `}</style>
    </>
  );
});

NotificationStack.displayName = "NotificationStack";
