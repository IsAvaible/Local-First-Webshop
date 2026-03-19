import { db } from "@/db/connection";
import * as schema from "@/db/schema";
import { reset } from "drizzle-seed";
import { faker } from "@faker-js/faker";
import type { CreateProduct } from "@/db/schema";

// Helper function to chunk arrays for safe bulk inserts
function chunkArray<T>(array: T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error("Chunk size must be greater than 0.");
  }

  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

export async function resetDatabase() {
  await reset(db, schema);
}

export async function seedDatabase(
  options: {
    companies?: number;
    categories?: number;
    productsPerCategory?: number;
    inventoryPerProduct?: number;
  } = {}
) {
  const COMPANIES_TO_CREATE = options.companies ?? 2;
  const CATEGORIES_TO_CREATE = options.categories ?? 2;
  const PRODUCTS_PER_CATEGORY = options.productsPerCategory ?? 5;
  const INVENTORY_PER_PRODUCT = options.inventoryPerProduct ?? 1000;

  // Deterministic seeding for easier debugging
  faker.seed(123);

  await db.transaction(async (tx) => {
    // Bulk Insert Companies
    const companyData = Array.from({ length: COMPANIES_TO_CREATE }, () => ({
      name: faker.company.name()
    }));
    const insertedCompanies = await tx
      .insert(schema.companiesTable)
      .values(companyData)
      .returning({ id: schema.companiesTable.id });

    // Bulk Insert Categories
    const categoryData = Array.from({ length: CATEGORIES_TO_CREATE }, () => ({
      name: faker.commerce.department(),
      description: faker.commerce.productDescription().slice(0, 250)
    }));
    const insertedCategories = await tx
      .insert(schema.categoriesTable)
      .values(categoryData)
      .returning({ id: schema.categoriesTable.id });

    // Generate Product Data in Memory
    const allProductData: CreateProduct[] = [];

    for (const category of insertedCategories) {
      for (let i = 0; i < PRODUCTS_PER_CATEGORY; i++) {
        allProductData.push({
          name: faker.commerce.productName(),
          description: faker.commerce.productDescription(),
          category_id: category.id,
          company_id: faker.helpers.arrayElement(insertedCompanies).id,
          base_product_id: null
        });
      }
    }

    // Bulk Insert Products in Chunks
    const CHUNK_SIZE = 2500;
    const productChunks = chunkArray(allProductData, CHUNK_SIZE);
    const insertedProducts: { id: number }[] = [];

    for (const chunk of productChunks) {
      const insertedChunk = await tx
        .insert(schema.productsTable)
        .values(chunk)
        .returning({ id: schema.productsTable.id }); // Only return what we need
      insertedProducts.push(...insertedChunk);
    }

    const allPricingTiers = [];
    const allInventoryLedgerData = [];

    allPricingTiers.length = insertedProducts.length;
    allInventoryLedgerData.length = insertedProducts.length;

    for (let i = 0; i < insertedProducts.length; i++) {
      const productId = insertedProducts[i].id;

      allPricingTiers[i] = {
        product_id: productId,
        min_quantity: 1,
        price_per_unit: faker.commerce.price({ min: 10, max: 200 })
      };

      allInventoryLedgerData[i] = {
        product_id: productId,
        quantity_change: INVENTORY_PER_PRODUCT,
        reason: "restock" as const
      };
    }

    // Bulk Insert Pricing Tiers in Chunks
    const pricingChunks = chunkArray(allPricingTiers, CHUNK_SIZE);
    for (const chunk of pricingChunks) {
      await tx.insert(schema.pricingTiersTable).values(chunk);
    }

    // Bulk Insert Inventory Ledger in Chunks
    if (allInventoryLedgerData.length > 0) {
      const inventoryChunks = chunkArray(allInventoryLedgerData, CHUNK_SIZE);
      for (const chunk of inventoryChunks) {
        await tx.insert(schema.inventoryLedgerTable).values(chunk);
      }
    }
  });

  // Wait to stabilize
  await new Promise((resolve) => setTimeout(resolve, 500));
}
