import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db/connection";
import { notificationsTable, type Notification } from "@/db/schema";

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
import { NotificationIcon } from "@/components/notifications/NotificationIcon";
import { useVirtualizer } from "@tanstack/react-virtual";

// --- Server Functions ---

const idSchema = z.uuidv4();

const getNotifications = createServerFn({ method: "GET" }).handler(async () => {
  return (await db
    .select()
    .from(notificationsTable)
    .orderBy(desc(notificationsTable.updated_at))) as Notification[];
});

const markNotificationsAsSeen = createServerFn({ method: "POST" })
  .inputValidator(z.object({ ids: z.array(idSchema) }))
  .handler(async ({ data: { ids } }) => {
    if (ids.length === 0) return { success: true };
    await db
      .update(notificationsTable)
      .set({ seen_at: new Date() })
      .where(inArray(notificationsTable.id, ids));
    return { success: true };
  });

const markNotificationsAsRead = createServerFn({ method: "POST" })
  .inputValidator(z.object({ ids: z.array(idSchema) }))
  .handler(async ({ data: { ids } }) => {
    if (ids.length === 0) return { success: true };
    await db
      .update(notificationsTable)
      .set({ read_at: new Date() })
      .where(inArray(notificationsTable.id, ids));
    return { success: true };
  });

const markNotificationAsClicked = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: idSchema,
      needsSeen: z.boolean(),
      needsRead: z.boolean()
    })
  )
  .handler(async ({ data: { id, needsSeen, needsRead } }) => {
    const updateData: Record<string, Date> = { clicked_at: new Date() };
    if (needsSeen) updateData.seen_at = new Date();
    if (needsRead) updateData.read_at = new Date();

    await db
      .update(notificationsTable)
      .set(updateData)
      .where(eq(notificationsTable.id, id));
    return { success: true };
  });

// --- Client Component ---

export function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [parentRef, setParentRef] = useState<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

  // Fetch notifications data
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications()
  });

  // Derive counts and specific IDs on the client side
  const unseenIds = useMemo(
    () => notifications.filter((n) => !n.seen_at).map((n) => n.id),
    [notifications]
  );

  const unreadIds = useMemo(
    () => notifications.filter((n) => !n.read_at).map((n) => n.id),
    [notifications]
  );

  const unseenCount = unseenIds.length;
  const unreadCount = unreadIds.length;

  // Mutations
  const markSeenMutation = useMutation({
    mutationFn: (ids: string[]) => markNotificationsAsSeen({ data: { ids } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const markReadMutation = useMutation({
    mutationFn: (ids: string[]) => markNotificationsAsRead({ data: { ids } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const markClickedMutation = useMutation({
    mutationFn: (data: {
      id: string;
      needsSeen: boolean;
      needsRead: boolean;
    }) => markNotificationAsClicked({ data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const rowVirtualizer = useVirtualizer({
    count: notifications.length,
    getScrollElement: () => parentRef,
    estimateSize: () => 85,
    overscan: 5
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);

    if (open && unseenIds.length > 0) {
      markSeenMutation.mutate(unseenIds);
    }
  };

  const handleMarkAllAsRead = () => {
    if (unreadIds.length === 0) return;
    markReadMutation.mutate(unreadIds);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.clicked_at) {
      markClickedMutation.mutate({
        id: notification.id,
        needsSeen: !notification.seen_at,
        needsRead: !notification.read_at
      });
    }

    if (notification.route) {
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="group relative"
          aria-label={`Notifications, ${unreadCount} unread`}
        >
          <BellIcon
            className="size-6! transition-transform group-hover:scale-110"
            aria-hidden="true"
          />
          {unseenCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
              variant="destructive"
              // Live region so screen readers announce updates
              aria-live="polite"
              aria-atomic="true"
            >
              {unseenCount}
            </Badge>
          )}
          <span className="sr-only">
            {unseenCount > 0
              ? `${unseenCount} new notifications`
              : "No new notifications"}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 p-0"
        align="end"
        role="dialog"
        aria-label="Notifications Panel"
      >
        <div className="flex items-center justify-between border-b p-4">
          <h4 id="notifications-heading" className="leading-none font-semibold">
            Notifications
          </h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground h-auto px-2 py-1 text-xs"
              onClick={handleMarkAllAsRead}
              aria-label="Mark all notifications as read"
              disabled={markReadMutation.isPending}
            >
              <CheckCheckIcon className="mr-1 h-3 w-3" aria-hidden="true" />
              Mark all read
            </Button>
          )}
        </div>

        <div
          ref={setParentRef}
          className="max-h-[400px] w-full overflow-y-auto outline-hidden"
          role="list"
          aria-labelledby="notifications-heading"
          tabIndex={0}
        >
          {notifications.length === 0 ? (
            <div
              className="text-muted-foreground p-4 text-center text-sm"
              role="listitem"
            >
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
                const isUnread = !notification.read_at;

                return (
                  <Link
                    to={notification.route ?? undefined}
                    // @ts-expect-error route_params is JSON type
                    params={notification.route_params ?? undefined}
                    // @ts-expect-error search_params is JSON type
                    search={notification.search_params ?? undefined}
                    key={virtualRow.key}
                    ref={rowVirtualizer.measureElement}
                    role="listitem"
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
                          aria-hidden="true"
                        />
                        <span className="font-semibold">
                          {isUnread && (
                            <span className="sr-only">Unread: </span>
                          )}
                          {notification.title}
                        </span>
                      </div>
                      <time
                        className="text-muted-foreground shrink-0 text-xs"
                        dateTime={notification.created_at?.toISOString()}
                      >
                        {notification.created_at &&
                          formatDistanceToNow(notification.created_at, {
                            addSuffix: true
                          })}
                      </time>
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
