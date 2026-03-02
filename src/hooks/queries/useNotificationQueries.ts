import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNotifications,
  markNotificationsAsSeen,
  markNotificationsAsRead,
  markNotificationAsClicked
} from "@/server/functions/notifications.ts";

export function useNotificationsQuery() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications()
  });
}

export function useMarkNotificationsAsSeenMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => markNotificationsAsSeen({ data: { ids } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });
}

export function useMarkNotificationsAsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => markNotificationsAsRead({ data: { ids } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });
}

export function useMarkNotificationAsClickedMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      id: string;
      needsSeen: boolean;
      needsRead: boolean;
    }) => markNotificationAsClicked({ data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });
}
