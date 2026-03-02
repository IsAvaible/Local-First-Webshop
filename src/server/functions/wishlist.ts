import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and, inArray, asc } from "drizzle-orm";

import { db } from "@/db/connection";
import {
  wishlistTable,
  productsTable,
  assetsTable,
  type Asset
} from "@/db/schema";

export const getProductWishlist = createServerFn({ method: "GET" })
  .inputValidator(z.object({ productId: z.number(), userId: z.string() }))
  .handler(async ({ data }) => {
    return db
      .select()
      .from(wishlistTable)
      .where(
        and(
          eq(wishlistTable.product_id, data.productId),
          eq(wishlistTable.user_id, data.userId)
        )
      );
  });

export const getWishlistItems = createServerFn({ method: "GET" }).handler(
  async () => {
    // 1. Fetch wishlist items joined with product data
    const wishlistRows = await db
      .select({
        wishlistId: wishlistTable.id,
        price_snapshot: wishlistTable.price_snapshot,
        product: productsTable
      })
      .from(wishlistTable)
      .innerJoin(productsTable, eq(wishlistTable.product_id, productsTable.id));

    // 2. Fetch the first asset for each product (matching the subquery logic)
    const productIds = wishlistRows.map((r) => r.product.id);
    const firstAssetByProductId = new Map<number, Asset>();

    if (productIds.length > 0) {
      const assetRows = await db
        .select()
        .from(assetsTable)
        .where(inArray(assetsTable.product_id, productIds))
        .orderBy(asc(assetsTable.id));

      for (const asset of assetRows) {
        if (!firstAssetByProductId.has(asset.product_id)) {
          firstAssetByProductId.set(asset.product_id, asset);
        }
      }
    }

    // 3. Combine and return the structured data
    return wishlistRows.map((row) => ({
      ...row,
      asset: firstAssetByProductId.get(row.product.id)
    }));
  }
);

export const addWishlistItem = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      user_id: z.string(),
      product_id: z.number(),
      price_snapshot: z.string()
    })
  )
  .handler(async ({ data }) => {
    await db.insert(wishlistTable).values({
      ...data,
      created_at: new Date()
    });
    return { success: true };
  });

export const removeWishlistItem = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data: { id } }) => {
    await db.delete(wishlistTable).where(eq(wishlistTable.id, id));
    return { success: true };
  });
