import { createServerFn } from "@tanstack/react-start";
import { eq, desc, asc, and, ne, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/connection";
import {
  productsTable,
  categoriesTable,
  companiesTable,
  assetsTable,
  pricingTiersTable,
  customFieldDefinitionsTable,
  customFieldValuesTable,
  type CustomFieldValue,
  type Company,
  type Asset
} from "@/db/schema";

export const getProductPageData = createServerFn({ method: "GET" })
  .inputValidator(z.object({ productId: z.number() }))
  .handler(async ({ data }) => {
    const { productId } = data;

    const productRows = await db
      .select({
        product: productsTable,
        category: categoriesTable,
        company: companiesTable
      })
      .from(productsTable)
      .leftJoin(
        categoriesTable,
        eq(productsTable.category_id, categoriesTable.id)
      )
      .leftJoin(companiesTable, eq(productsTable.company_id, companiesTable.id))
      .where(eq(productsTable.id, productId));

    const productData = productRows[0] || {};

    const assetsData = await db
      .select()
      .from(assetsTable)
      .where(eq(assetsTable.product_id, productId));

    const pricingTiersData = await db
      .select()
      .from(pricingTiersTable)
      .where(eq(pricingTiersTable.product_id, productId))
      .orderBy(desc(pricingTiersTable.min_quantity));

    // Fetch custom field values and their definitions for this product
    const customFieldRows = await db
      .select({
        cfv: customFieldValuesTable,
        cfd: customFieldDefinitionsTable
      })
      .from(customFieldValuesTable)
      .innerJoin(
        customFieldDefinitionsTable,
        eq(
          customFieldValuesTable.field_definition_id,
          customFieldDefinitionsTable.id
        )
      )
      .where(eq(customFieldValuesTable.product_id, productId));

    const customFieldData = customFieldRows.map(({ cfv, cfd }) => ({
      ...(cfv as CustomFieldValue),
      ...cfd
    }));

    return {
      product: productData.product,
      category: productData.category,
      company: productData.company as Company,
      assets: assetsData,
      pricingTiers: pricingTiersData,
      customFields: customFieldData
    };
  });

export const getRelatedProducts = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      currentProductId: z.number().optional()
    })
  )
  .handler(async ({ data: { currentProductId } }) => {
    const products = await db
      .select()
      .from(productsTable)
      .where(
        currentProductId ? ne(productsTable.id, currentProductId) : undefined
      )
      .limit(4);

    if (products.length === 0) {
      return [];
    }

    const productIds = products.map((p) => p.id);
    const firstAssetByProductId = new Map<number, Asset>();

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

    return products.map((product) => ({
      ...product,
      asset: firstAssetByProductId.get(product.id)
    }));
  });

export const getProductLookupData = createServerFn({ method: "GET" })
  .inputValidator(z.object({ productIds: z.array(z.number()) }))
  .handler(async ({ data: { productIds } }) => {
    if (!productIds || productIds.length === 0) {
      return { products: [], assets: [], tiers: [] };
    }

    // Deduplicate IDs for the DB query
    const uniqueIds = Array.from(new Set(productIds));

    // Fetch all related data concurrently
    const [products, assets, tiers] = await Promise.all([
      db
        .select()
        .from(productsTable)
        .where(inArray(productsTable.id, uniqueIds)),
      db
        .select()
        .from(assetsTable)
        .where(inArray(assetsTable.product_id, uniqueIds))
        .orderBy(desc(assetsTable.id)),
      db
        .select()
        .from(pricingTiersTable)
        .where(inArray(pricingTiersTable.product_id, uniqueIds))
    ]);

    return { products, assets, tiers };
  });
