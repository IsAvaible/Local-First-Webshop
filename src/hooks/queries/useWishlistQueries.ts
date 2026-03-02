import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProductWishlist,
  getWishlistItems,
  addWishlistItem,
  removeWishlistItem
} from "@/server/functions/wishlist.ts";

export function useProductWishlistQuery(productId: number, userId?: string) {
  return useQuery({
    queryKey: ["wishlist", productId, userId],
    queryFn: () => getProductWishlist({ data: { productId, userId: userId! } }),
    enabled: !!userId
  });
}

export function useWishlistItemsQuery() {
  return useQuery({
    queryKey: ["wishlist"],
    queryFn: () => getWishlistItems()
  });
}

export function useAddWishlistItemMutation(productId: number, userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof addWishlistItem>[0]["data"]) =>
      addWishlistItem({ data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["wishlist", productId, userId]
      });
      // Also invalidate general wishlist query
      await queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    }
  });
}

export function useRemoveWishlistItemMutation(
  productId?: number,
  userId?: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => removeWishlistItem({ data: { id } }),
    onSuccess: async () => {
      // Invalidate specific product wishlist if product/user ids provided
      if (productId && userId) {
        await queryClient.invalidateQueries({
          queryKey: ["wishlist", productId, userId]
        });
      }
      // Always invalidate general wishlist query
      await queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    }
  });
}
