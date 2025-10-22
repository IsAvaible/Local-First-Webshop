import {
  boolean,
  integer,
  pgTable,
  timestamp,
  varchar,
  text,
  jsonb,
  decimal,
  index,
  type AnyPgColumn
} from "drizzle-orm/pg-core";
import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod";
export * from "./auth-schema";
import { users } from "./auth-schema";

const { createInsertSchema, createSelectSchema, createUpdateSchema } =
  createSchemaFactory({ zodInstance: z });

// --- COMPANY SCHEMA ---

export const companiesTable = pgTable("companies", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  description: text("description"),
  // Store branding info like logo_url, primary_color, etc.
  branding: jsonb("branding").default({}),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow()
});

export const selectCompanySchema = createSelectSchema(companiesTable);
export const createCompanySchema = createInsertSchema(companiesTable).omit({
  created_at: true
});
export const updateCompanySchema = createUpdateSchema(companiesTable).omit({
  created_at: true
});

// --- CATEGORY SCHEMA ---

export const categoriesTable = pgTable("categories", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  description: text("description"),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow()
});

export const selectCategorySchema = createSelectSchema(categoriesTable);
export const createCategorySchema = createInsertSchema(categoriesTable).omit({
  created_at: true
});
export const updateCategorySchema = createUpdateSchema(categoriesTable).omit({
  created_at: true
});

// --- PRODUCT SCHEMA ---

export const productsTable = pgTable(
  "products",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull(),
    description: text("description"),
    company_id: integer()
      .notNull()
      .references(() => companiesTable.id, { onDelete: "restrict" }),
    category_id: integer()
      .notNull()
      .references(() => categoriesTable.id, { onDelete: "restrict" }),
    // For Product Variants: self-referencing FK
    // A variant links to its base product.
    base_product_id: integer().references((): AnyPgColumn => productsTable.id, {
      onDelete: "set null"
    }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    baseProductIdIdx: index("base_product_id_idx").on(table.base_product_id),
    companyIdIdx: index("company_id_idx").on(table.company_id),
    categoryIdIdx: index("category_id_idx").on(table.category_id)
  })
);

export const selectProductSchema = createSelectSchema(productsTable);
export const createProductSchema = createInsertSchema(productsTable).omit({
  created_at: true
});
export const updateProductSchema = createUpdateSchema(productsTable).omit({
  created_at: true
});

// --- TIERED PRICING SCHEMA ---
export const pricingTiersTable = pgTable("pricing_tiers", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  product_id: integer()
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  min_quantity: integer().notNull().default(1),
  price_per_unit: decimal("price_per_unit", {
    precision: 10,
    scale: 2
  }).notNull()
});

export const selectPricingTierSchema = createSelectSchema(pricingTiersTable);
export const createPricingTierSchema = createInsertSchema(pricingTiersTable);
export const updatePricingTierSchema = createUpdateSchema(pricingTiersTable);

// --- ASSETS SCHEMA ---
export const assetsTable = pgTable("assets", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  product_id: integer()
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  file_extension: varchar({ length: 10 }).notNull(),
  file_size: integer().notNull(),
  mime_type: varchar({ length: 100 }).notNull(),
  alt: text("alt").notNull(),
  description: text("description"),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow()
});

export const selectAssetSchema = createSelectSchema(assetsTable);
export const createAssetSchema = createInsertSchema(assetsTable).omit({
  created_at: true
});
export const updateAssetSchema = createUpdateSchema(assetsTable).omit({
  created_at: true
});

// --- CUSTOM FIELDS SCHEMA (PART 1: DEFINITIONS) ---
export const customFieldDefinitionsTable = pgTable("custom_field_definitions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  category_id: integer()
    .notNull()
    .references(() => categoriesTable.id, { onDelete: "cascade" }),
  field_name: varchar({ length: 100 }).notNull(),
  field_type: varchar({ length: 50 }).notNull().default("text") // e.g., 'text', 'number', 'boolean'
});

export const selectCustomFieldDefinitionSchema = createSelectSchema(
  customFieldDefinitionsTable
);
export const createCustomFieldDefinitionSchema = createInsertSchema(
  customFieldDefinitionsTable
);
export const updateCustomFieldDefinitionSchema = createUpdateSchema(
  customFieldDefinitionsTable
);

// --- CUSTOM FIELDS SCHEMA (PART 2: VALUES) ---
export const customFieldValuesTable = pgTable("custom_field_values", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  product_id: integer()
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  field_definition_id: integer()
    .notNull()
    .references(() => customFieldDefinitionsTable.id, { onDelete: "cascade" }),
  value: jsonb("value")
});

export const selectCustomFieldValueSchema = createSelectSchema(
  customFieldValuesTable
);
export const createCustomFieldValueSchema = createInsertSchema(
  customFieldValuesTable
);
export const updateCustomFieldValueSchema = createUpdateSchema(
  customFieldValuesTable
);

export const projectsTable = pgTable("projects", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  description: text(),
  shared_user_ids: text("shared_user_ids").array().notNull().default([]),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  owner_id: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
});

export const todosTable = pgTable("todos", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  text: varchar({ length: 500 }).notNull(),
  completed: boolean().notNull().default(false),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  project_id: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  user_ids: text("user_ids").array().notNull().default([])
});

export const selectProjectSchema = createSelectSchema(projectsTable);
export const createProjectSchema = createInsertSchema(projectsTable).omit({
  created_at: true
});
export const updateProjectSchema = createUpdateSchema(projectsTable);

export const selectTodoSchema = createSelectSchema(todosTable);
export const createTodoSchema = createInsertSchema(todosTable).omit({
  created_at: true
});
export const updateTodoSchema = createUpdateSchema(todosTable);

export const selectUsersSchema = createSelectSchema(users);

export type Project = z.infer<typeof selectProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;
export type Todo = z.infer<typeof selectTodoSchema>;
export type UpdateTodo = z.infer<typeof updateTodoSchema>;
export type User = z.infer<typeof selectUsersSchema>;
export type Product = z.infer<typeof selectProductSchema>;
export type Category = z.infer<typeof selectCategorySchema>;
export type Company = z.infer<typeof selectCompanySchema>;
export type PricingTier = z.infer<typeof selectPricingTierSchema>;
export type Asset = z.infer<typeof selectAssetSchema>;
export type CustomFieldDefinition = z.infer<
  typeof selectCustomFieldDefinitionSchema
>;
export type CustomFieldValue = z.infer<typeof selectCustomFieldValueSchema>;
