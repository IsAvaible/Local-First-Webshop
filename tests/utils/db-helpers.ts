import { db } from "@/db/connection";
import * as schema from "@/db/schema";
import { reset } from "drizzle-seed";
import { faker } from "@faker-js/faker";
import type { Product } from "@/db/schema";

export async function resetDatabase() {
  await reset(db, schema);
}

export async function seedDatabase(
  options: {
    companies?: number;
    categories?: number;
    productsPerCategory?: number;
  } = {}
) {
  const COMPANIES_TO_CREATE = options.companies ?? 2;
  const CATEGORIES_TO_CREATE = options.categories ?? 2;
  const PRODUCTS_PER_CATEGORY = options.productsPerCategory ?? 5;

  // Deterministic seeding for easier debugging
  faker.seed(123);

  await db.transaction(async (tx) => {
    // Insert Companies
    const companyData = Array.from({ length: COMPANIES_TO_CREATE }, () => ({
      name: faker.company.name()
    }));
    const insertedCompanies = await tx
      .insert(schema.companiesTable)
      .values(companyData)
      .returning();

    // Insert Categories
    const categoryData = Array.from({ length: CATEGORIES_TO_CREATE }, () => ({
      name: faker.commerce.department(),
      description: faker.commerce.productDescription().slice(0, 250)
    }));
    const insertedCategories = await tx
      .insert(schema.categoriesTable)
      .values(categoryData)
      .returning();

    // Insert Products
    for (const category of insertedCategories) {
      for (let i = 0; i < PRODUCTS_PER_CATEGORY; i++) {
        const productData: Omit<Product, "id" | "created_at"> = {
          name: faker.commerce.productName(),
          description: faker.commerce.productDescription(),
          category_id: category.id,
          company_id: faker.helpers.arrayElement(insertedCompanies).id,
          base_product_id: null
        };

        const [product] = await tx
          .insert(schema.productsTable)
          .values(productData)
          .returning();

        // Pricing Tier (Simple)
        await tx.insert(schema.pricingTiersTable).values({
          product_id: product.id,
          min_quantity: 1,
          price_per_unit: faker.commerce.price({ min: 10, max: 200 })
        });
      }
    }
  });
}
