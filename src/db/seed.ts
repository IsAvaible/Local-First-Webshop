import * as schema from "./schema";
import "dotenv/config";
import { db } from "@/db/connection.ts";
import { reset } from "drizzle-seed";
import { faker } from "@faker-js/faker";
import type { Product } from "./schema";

// --- Configuration ---
const COMPANIES_TO_CREATE = 5;
const CATEGORIES_TO_CREATE = 4;
const PRODUCTS_PER_CATEGORY = 10; // Each category will have this many products
const VARIANT_CHANCE = 0.2; // 20% chance a product is a variant of the previous one
// ---------------------

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set.");
}

// Helper type for the custom field definitions
type FieldDef = typeof schema.customFieldDefinitionsTable.$inferSelect;

async function main() {
  console.log("Seeding database... 🌱");

  // 1. Reset the database
  await reset(db, schema);

  await db.transaction(async (tx) => {
    console.log("Cleared old data.");

    // 2. Insert Companies
    console.log(`Inserting ${COMPANIES_TO_CREATE} companies...`);
    const companyData = Array.from({ length: COMPANIES_TO_CREATE }, () => ({
      name: faker.company.name()
    }));
    const insertedCompanies = await tx
      .insert(schema.companiesTable)
      .values(companyData)
      .returning();

    // 3. Insert Categories
    console.log(`Inserting ${CATEGORIES_TO_CREATE} categories...`);
    const categoryData = Array.from({ length: CATEGORIES_TO_CREATE }, () => ({
      name: faker.commerce.department(),
      description: faker.commerce.productDescription().slice(0, 250) // Truncate to avoid errors
    }));
    const insertedCategories = await tx
      .insert(schema.categoriesTable)
      .values(categoryData)
      .returning();

    // 4. Insert Custom Field Definitions (linked to categories)
    console.log("Inserting custom field definitions...");
    const fieldDefData = [];
    const fieldTypes: ("text" | "number" | "boolean" | "date" | "select")[] = [
      "text",
      "number",
      "boolean",
      "date",
      "select"
    ];

    for (const category of insertedCategories) {
      // Create 2-4 fields for each category
      const numFields = faker.number.int({ min: 2, max: 4 });
      for (let i = 0; i < numFields; i++) {
        const fieldType = faker.helpers.arrayElement(fieldTypes);
        let options: string[] | null = null;

        if (fieldType === "select") {
          options = Array.from(
            { length: faker.number.int({ min: 3, max: 5 }) },
            () => faker.word.noun()
          );
        }

        fieldDefData.push({
          category_id: category.id,
          field_name: `${faker.commerce.productAdjective()} ${faker.word.noun()}`,
          field_type: fieldType,
          options: options
        });
      }
    }
    const insertedFieldDefs = await tx
      .insert(schema.customFieldDefinitionsTable)
      .values(fieldDefData)
      .returning();

    // Create a map for easy lookup: { categoryId: [fieldDef1, fieldDef2] }
    const categoryFieldDefs = insertedFieldDefs.reduce(
      (acc, def) => {
        if (!acc[def.category_id]) {
          acc[def.category_id] = [];
        }
        acc[def.category_id].push(def);
        return acc;
      },
      {} as Record<string, FieldDef[]>
    );

    // 5. Insert Products
    console.log("Inserting products (with variants)...");
    const insertedProducts = [];
    const customValueData = [];
    const assetData = [];
    const pricingTierData = [];

    // We pass the whole FieldDef to access options for 'select'
    const generateValue = (
      fieldDef: FieldDef
    ): string | number | boolean | Date => {
      const options = fieldDef.options ?? [];

      switch (fieldDef.field_type) {
        case "text":
          return faker.lorem.words(3);
        case "number":
          return faker.number.int({ min: 1, max: 1000 });
        case "boolean":
          return faker.datatype.boolean();
        case "date":
          return faker.date.future(); // Generates a Date object
        case "select":
          // Pick a random value from the defined options
          if (options.length > 0) {
            return faker.helpers.arrayElement(options);
          }
          return faker.word.noun(); // Fallback if no options
        default:
          return faker.lorem.word(); // Fallback for any unknown type
      }
    };

    for (const category of insertedCategories) {
      let lastBaseProductId: number | null = null;
      const fieldsForThisCategory = categoryFieldDefs[category.id] || [];

      for (let i = 0; i < PRODUCTS_PER_CATEGORY; i++) {
        const isVariant = !!(
          lastBaseProductId && Math.random() < VARIANT_CHANCE
        );
        const productName = faker.commerce.productName();

        const productData: Omit<Product, "id" | "created_at"> = {
          name: isVariant ? `${productName} (Variant)` : productName,
          description: faker.commerce.productDescription(),
          category_id: category.id,
          company_id: faker.helpers.arrayElement(insertedCompanies).id,
          base_product_id: isVariant ? lastBaseProductId : null
        };

        // We insert one-by-one here to get the 'id' for variants.
        const [product] = await tx
          .insert(schema.productsTable)
          .values(productData)
          .returning();

        insertedProducts.push(product);

        if (!isVariant) {
          lastBaseProductId = product.id; // This is a new base product
        }

        // 6. Insert Pricing Tiers (while we have the product)
        const numTiers = faker.number.int({ min: 1, max: 3 });
        const basePrice = parseFloat(
          faker.commerce.price({ min: 10, max: 2000 })
        );
        const minQuantities = [1, 10, 50];

        for (let t = 0; t < numTiers; t++) {
          const price = basePrice * (1 - t * 0.1); // 10% discount per tier
          pricingTierData.push({
            product_id: product.id,
            min_quantity: minQuantities[t],
            price_per_unit: price.toFixed(2)
          });
        }

        // 7. Insert Assets (while we have the product)
        const numImages = faker.number.int({ min: 1, max: 3 });
        for (let a = 0; a < numImages; a++) {
          assetData.push({
            product_id: product.id,
            url: faker.image.urlPicsumPhotos({
              width: 600,
              height: 600,
              blur: 0
            }),
            file_extension: "jpg",
            mime_type: "image/jpeg",
            file_size: faker.number.int({ min: 50000, max: 500000 }),
            alt: `${product.name} Image ${a + 1}`
          });
        }

        // 8. Insert Custom Field Values (while we have product and fields)
        for (const fieldDef of fieldsForThisCategory) {
          customValueData.push({
            product_id: product.id,
            field_definition_id: fieldDef.id,
            value: generateValue(fieldDef)
          });
        }
      }
    }

    // Now, bulk-insert all the dependent data
    if (pricingTierData.length > 0) {
      console.log(`Inserting ${pricingTierData.length} pricing tiers...`);
      await tx.insert(schema.pricingTiersTable).values(pricingTierData);
    }

    if (assetData.length > 0) {
      console.log(`Inserting ${assetData.length} assets...`);
      await tx.insert(schema.assetsTable).values(assetData);
    }

    if (customValueData.length > 0) {
      console.log(`Inserting ${customValueData.length} custom field values...`);
      await tx.insert(schema.customFieldValuesTable).values(customValueData);
    }
  });

  console.log("Database seeding complete! 🚀");
}

main().catch((err) => {
  console.error("Error during seeding:", err);
  process.exit(1);
});
