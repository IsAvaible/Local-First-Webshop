import { useMemo, useState } from "react";
import { isNull, useLiveQuery } from "@tanstack/react-db";
import { notificationsCollection } from "@/lib/collections";
import { BellIcon, CheckCheckIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import type { Notification } from "@/db/schema.ts";
import { NotificationIcon } from "@/components/notifications/NotificationIcon.tsx";
import { useVirtualizer } from "@tanstack/react-virtual";

export function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [parentRef, setParentRef] = useState<HTMLDivElement | null>(null);

  const { data: notifications = [] } = useLiveQuery((q) => {
    return q
      .from({ n: notificationsCollection })
      .orderBy(({ n }) => n.updated_at, "desc");
  });

  const { data: unseenRows = [] } = useLiveQuery((q) => {
    return q
      .from({ n: notificationsCollection })
      .where(({ n }) => isNull(n.seen_at))
      .select(({ n }) => ({ id: n.id }));
  });

  const unseenIds = useMemo(
    () => unseenRows.map((row) => row.id),
    [unseenRows]
  );

  const { data: unreadRows = [] } = useLiveQuery((q) => {
    return q
      .from({ n: notificationsCollection })
      .where(({ n }) => isNull(n.read_at))
      .select(({ n }) => ({ id: n.id }));
  });

  const unreadIds = useMemo(
    () => unreadRows.map((row) => row.id),
    [unreadRows]
  );

  const unseenCount = unseenIds.length;
  const unreadCount = unreadIds.length;

  const rowVirtualizer = useVirtualizer({
    count: notifications.length,
    getScrollElement: () => parentRef,
    estimateSize: () => 85, // Approximate height of a row in pixels
    overscan: 5 // Render 5 extra items off-screen for smoother scrolling
  });

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);

    if (open && unseenIds.length > 0) {
      const tx = notificationsCollection.update(unseenIds, (drafts) => {
        drafts.forEach((draft) => {
          draft.seen_at = new Date();
        });
      });
      await tx.isPersisted.promise;
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadIds.length === 0) return;

    const tx = notificationsCollection.update(unreadIds, (drafts) => {
      drafts.forEach((draft) => {
        draft.read_at = new Date();
      });
    });

    await tx.isPersisted.promise;
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.clicked_at) {
      notificationsCollection.update(notification.id, (n) => {
        n.seen_at ??= new Date();
        n.read_at ??= new Date();
        n.clicked_at = new Date();
      });
    }

    if (notification.route) {
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="group relative">
          <BellIcon className="size-6! transition-transform group-hover:scale-110" />
          {unseenCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
              variant="destructive"
            >
              {unseenCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b p-4">
          <h4 className="leading-none font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground h-auto px-2 py-1 text-xs"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheckIcon className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>

        <div
          ref={setParentRef}
          className="max-h-[400px] w-full overflow-y-auto"
        >
          {notifications.length === 0 ? (
            <div className="text-muted-foreground p-4 text-center text-sm">
              No notifications
            </div>
          ) : (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative"
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const notification = notifications[virtualRow.index];

                return (
                  <Link
                    to={notification.route ?? undefined}
                    // @ts-expect-error route_params is JSON type
                    params={notification.route_params ?? undefined}
                    // @ts-expect-error search_params is JSON type
                    search={notification.search_params ?? undefined}
                    role={"button"}
                    key={virtualRow.key}
                    ref={rowVirtualizer.measureElement}
                    data-index={virtualRow.index}
                    onClick={() => handleNotificationClick(notification)}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`
                    }}
                    className={cn(
                      "hover:bg-muted/50 flex flex-col gap-1 border-b p-4 text-left text-sm transition-colors last:border-0 hover:cursor-pointer",
                      !notification.read_at &&
                        "bg-blue-50/50 dark:bg-blue-950/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <NotificationIcon
                          type={notification.type}
                          className="h-3 w-3"
                        />
                        <span className="font-semibold">
                          {notification.title}
                        </span>
                      </div>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {notification.created_at &&
                          formatDistanceToNow(notification.created_at, {
                            addSuffix: true
                          })}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{notification.body}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
