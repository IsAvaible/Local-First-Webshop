import * as schema from "./schema";
import "dotenv/config";
import { db } from "@/db/connection.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set.");
}

async function main() {
  console.log("Seeding database...");

  await db.transaction(async (tx) => {
    // 1. Clear existing data (in reverse order of dependencies)
    console.log("Clearing existing data...");
    await tx.delete(schema.customFieldValuesTable);
    await tx.delete(schema.customFieldDefinitionsTable);
    await tx.delete(schema.assetsTable);
    await tx.delete(schema.pricingTiersTable);
    await tx.delete(schema.productsTable);
    await tx.delete(schema.categoriesTable);
    await tx.delete(schema.companiesTable);

    // 2. Insert Companies
    console.log("Inserting companies...");
    const [company1] = await tx
      .insert(schema.companiesTable)
      .values({ name: "GadgetCo" })
      .returning();
    const [company2] = await tx
      .insert(schema.companiesTable)
      .values({ name: "KitchenWorks" })
      .returning();

    // 3. Insert Categories
    console.log("Inserting categories...");
    const [cat1] = await tx
      .insert(schema.categoriesTable)
      .values({
        name: "Electronics",
        description: "Digital gadgets and accessories"
      })
      .returning();
    const [cat2] = await tx
      .insert(schema.categoriesTable)
      .values({
        name: "Home Appliances",
        description: "Tools and appliances for your home"
      })
      .returning();

    // 4. Insert Custom Field Definitions (linked to categories)
    console.log("Inserting custom field definitions...");
    // Electronics fields
    const [field1] = await tx
      .insert(schema.customFieldDefinitionsTable)
      .values({
        category_id: cat1.id,
        field_name: "Warranty",
        field_type: "text"
      })
      .returning();
    const [field2] = await tx
      .insert(schema.customFieldDefinitionsTable)
      .values({
        category_id: cat1.id,
        field_name: "Screen Size (in)",
        field_type: "number"
      })
      .returning();
    // Home Appliance fields
    const [field3] = await tx
      .insert(schema.customFieldDefinitionsTable)
      .values({
        category_id: cat2.id,
        field_name: "Material",
        field_type: "text"
      })
      .returning();
    const [field4] = await tx
      .insert(schema.customFieldDefinitionsTable)
      .values({
        category_id: cat2.id,
        field_name: "Energy Rating",
        field_type: "text"
      })
      .returning();

    // 5. Insert Products
    console.log("Inserting products...");
    // Product 1: A base product
    const [prod1] = await tx
      .insert(schema.productsTable)
      .values({
        name: "Hyperion Laptop",
        description: "A powerful laptop for professionals.",
        category_id: cat1.id,
        company_id: company1.id
      })
      .returning();

    // Product 2: A variant of Product 1
    const [prod2] = await tx
      .insert(schema.productsTable)
      .values({
        name: "Hyperion Laptop (16GB RAM)",
        description: "A 16GB RAM variant of the Hyperion.",
        category_id: cat1.id,
        company_id: company1.id,
        base_product_id: prod1.id // <-- Inherits from prod1
      })
      .returning();

    // Product 3: Another product in a different category
    const [prod3] = await tx
      .insert(schema.productsTable)
      .values({
        name: "Smart Blender X1000",
        description: "The last blender you will ever need.",
        category_id: cat2.id,
        company_id: company2.id
      })
      .returning();

    // 6. Insert Pricing Tiers (tiered for prod1, flat for others)
    console.log("Inserting pricing tiers...");
    await tx.insert(schema.pricingTiersTable).values([
      // Tiered pricing for Hyperion Laptop
      { product_id: prod1.id, min_quantity: 1, price_per_unit: "1299.99" },
      { product_id: prod1.id, min_quantity: 5, price_per_unit: "1249.99" },
      { product_id: prod1.id, min_quantity: 20, price_per_unit: "1199.99" },
      // Flat pricing for the variant
      { product_id: prod2.id, min_quantity: 1, price_per_unit: "1499.99" },
      // Flat pricing for the blender
      { product_id: prod3.id, min_quantity: 1, price_per_unit: "89.50" }
    ]);

    // 7. Insert Assets
    console.log("Inserting assets...");
    await tx.insert(schema.assetsTable).values([
      {
        product_id: prod1.id,
        url: "https://placehold.co/600x600?text=Laptop",
        file_extension: "png",
        mime_type: "image/png",
        file_size: 204800,
        alt: `${prod1.name} Image`
      },
      {
        product_id: prod2.id,
        url: "https://placehold.co/600x600?text=Laptop+16GB",
        file_extension: "png",
        mime_type: "image/png",
        file_size: 204800,
        alt: `${prod2.name} Image`
      },
      {
        product_id: prod3.id,
        url: "https://placehold.co/600x600?text=Blender",
        file_extension: "png",
        mime_type: "image/png",
        file_size: 204800,
        alt: `${prod3.name} Image`
      },
      {
        product_id: prod3.id,
        url: "https://placehold.co/600x600?text=Blender+Detail",
        file_extension: "png",
        mime_type: "image/png",
        file_size: 204800,
        alt: `${prod3.name} Image`
      }
    ]);

    // 8. Insert Custom Field Values (linked to products and definitions)
    console.log("Inserting custom field values...");
    await tx.insert(schema.customFieldValuesTable).values([
      // Values for Prod 1 (Laptop)
      { product_id: prod1.id, field_definition_id: field1.id, value: "1 Year" },
      { product_id: prod1.id, field_definition_id: field2.id, value: 14 },
      // Values for Prod 2 (Laptop Variant)
      {
        product_id: prod2.id,
        field_definition_id: field1.id,
        value: "2 Year Pro"
      },
      { product_id: prod2.id, field_definition_id: field2.id, value: 15.6 },
      // Values for Prod 3 (Blender)
      {
        product_id: prod3.id,
        field_definition_id: field3.id,
        value: "Brushed Steel"
      },
      { product_id: prod3.id, field_definition_id: field4.id, value: "A++" }
    ]);
  });

  console.log("Database seeding complete! 🌱");
}

main().catch((err) => {
  console.error("Error during seeding:", err);
  process.exit(1);
});
