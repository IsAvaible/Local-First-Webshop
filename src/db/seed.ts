import * as schema from "./schema";
import "dotenv/config";
import { db } from "@/db/connection.ts";
import { reset } from "drizzle-seed";
import { faker } from "@faker-js/faker";
import sharp from "sharp";
import { encode } from "blurhash";
import type { Product } from "./schema";

// --- Configuration ---
const COMPANIES_TO_CREATE = 5;
const CATEGORIES_TO_CREATE = 4;
const PRODUCTS_PER_CATEGORY = 10;
const VARIANT_CHANCE = 0.2;
const CONCURRENCY_LIMIT = 5; // How many images to process into blurhashes in parallel
// ---------------------

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set.");
}

type FieldDef = typeof schema.customFieldDefinitionsTable.$inferSelect;

/**
 * Downloads an image from a URL, resizes it for performance,
 * and calculates the BlurHash.
 */
async function generateBlurHash(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to fetch ${imageUrl}`);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Resize to small width (e.g., 32px) for faster hashing.
    // BlurHash doesn't need full res.
    const { data, info } = await sharp(buffer)
      .resize(32, 32, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4);
  } catch (error) {
    console.warn(`Failed to generate blurhash for ${imageUrl}:`, error);
    return null;
  }
}

async function main() {
  console.log("Seeding database... 🌱");

  await reset(db, schema);

  await db.transaction(async (tx) => {
    console.log("Cleared old data.");

    // Insert Companies
    console.log(`Inserting ${COMPANIES_TO_CREATE} companies...`);
    const companyData = Array.from({ length: COMPANIES_TO_CREATE }, () => ({
      name: faker.company.name()
    }));
    const insertedCompanies = await tx
      .insert(schema.companiesTable)
      .values(companyData)
      .returning();

    // Insert Categories
    console.log(`Inserting ${CATEGORIES_TO_CREATE} categories...`);
    const categoryData = Array.from({ length: CATEGORIES_TO_CREATE }, () => ({
      name: faker.commerce.department(),
      description: faker.commerce.productDescription().slice(0, 250)
    }));
    const insertedCategories = await tx
      .insert(schema.categoriesTable)
      .values(categoryData)
      .returning();

    // Insert Custom Field Definitions
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

    const categoryFieldDefs = insertedFieldDefs.reduce(
      (acc, def) => {
        if (!acc[def.category_id]) acc[def.category_id] = [];
        acc[def.category_id].push(def);
        return acc;
      },
      {} as Record<string, FieldDef[]>
    );

    // Prepare Data Arrays
    const insertedProducts = [];
    const customValueData = [];
    const pricingTierData = [];

    // Store "pending" assets here to process them in a batch later
    const pendingAssets: {
      product_id: number;
      url: string;
      alt: string;
    }[] = [];

    const generateValue = (fieldDef: FieldDef) => {
      const options = fieldDef.options ?? [];
      switch (fieldDef.field_type) {
        case "text":
          return faker.lorem.words(3);
        case "number":
          return faker.number.int({ min: 1, max: 1000 });
        case "boolean":
          return faker.datatype.boolean();
        case "date":
          return faker.date.future();
        case "select":
          return options.length > 0
            ? faker.helpers.arrayElement(options)
            : faker.word.noun();
        default:
          return faker.lorem.word();
      }
    };

    // Build Product & Asset Stubs
    console.log("Generating product data...");

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

        const [product] = await tx
          .insert(schema.productsTable)
          .values(productData)
          .returning();

        insertedProducts.push(product);
        if (!isVariant) lastBaseProductId = product.id;

        // Pricing Tiers
        const numTiers = faker.number.int({ min: 1, max: 3 });
        const basePrice = parseFloat(
          faker.commerce.price({ min: 10, max: 2000 })
        );
        const minQuantities = [1, 10, 50];

        for (let t = 0; t < numTiers; t++) {
          pricingTierData.push({
            product_id: product.id,
            min_quantity: minQuantities[t],
            price_per_unit: (basePrice * (1 - t * 0.1)).toFixed(2)
          });
        }

        // Assets (Queue them up)
        const numImages = faker.number.int({ min: 1, max: 3 });
        for (let a = 0; a < numImages; a++) {
          const seed = faker.string.uuid();
          const width = 600;
          const height = 600;
          const url = `https://picsum.photos/seed/${seed}/${width}/${height}`;

          pendingAssets.push({
            product_id: product.id,
            url: url,
            alt: `${product.name} Image ${a + 1}`
          });
        }

        // Custom Fields
        for (const fieldDef of fieldsForThisCategory) {
          customValueData.push({
            product_id: product.id,
            field_definition_id: fieldDef.id,
            value: generateValue(fieldDef)
          });
        }
      }
    }

    // Process Assets (Download & Hash in Batches)
    console.log(
      `Processing ${pendingAssets.length} assets (calculating BlurHashes)...`
    );

    const finalAssetData = [];

    // Simple batch processor
    for (let i = 0; i < pendingAssets.length; i += CONCURRENCY_LIMIT) {
      const batch = pendingAssets.slice(i, i + CONCURRENCY_LIMIT);

      const results = await Promise.all(
        batch.map(async (assetStub) => {
          const hash = await generateBlurHash(assetStub.url);
          process.stdout.write("."); // Progress indicator
          return {
            ...assetStub,
            blur_hash: hash,
            file_extension: "jpg",
            mime_type: "image/jpeg",
            file_size: faker.number.int({ min: 50000, max: 500000 }) // Fake size
          };
        })
      );
      finalAssetData.push(...results);
    }
    console.log("\nAsset processing complete.");

    // Bulk Insert
    if (pricingTierData.length > 0) {
      await tx.insert(schema.pricingTiersTable).values(pricingTierData);
    }

    if (finalAssetData.length > 0) {
      await tx.insert(schema.assetsTable).values(finalAssetData);
    }

    if (customValueData.length > 0) {
      await tx.insert(schema.customFieldValuesTable).values(customValueData);
    }
  });

  console.log("Database seeding complete! 🚀");
}

main().catch((err) => {
  console.error("Error during seeding:", err);
  process.exit(1);
});
