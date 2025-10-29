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
  type AnyPgColumn,
  pgEnum,
  uniqueIndex
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

// --- CUSTOM FIELDS SCHEMA ---
export const customFieldTypeEnum = pgEnum("custom_field_type", [
  "text",
  "number",
  "boolean",
  "date",
  "select"
]);

// --- CUSTOM FIELDS SCHEMA (PART 1: DEFINITIONS) ---
export const customFieldDefinitionsTable = pgTable("custom_field_definitions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  category_id: integer()
    .notNull()
    .references(() => categoriesTable.id, { onDelete: "cascade" }),
  field_name: varchar({ length: 100 }).notNull(),
  field_type: customFieldTypeEnum("field_type").notNull().default("text"),
  options: jsonb("options").$type<string[]>()
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
export const customFieldValuesTable = pgTable(
  "custom_field_values",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    product_id: integer()
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    field_definition_id: integer()
      .notNull()
      .references(() => customFieldDefinitionsTable.id, {
        onDelete: "cascade"
      }),
    value: jsonb("value")
  },
  (table) => ({
    productIdIdx: index("value_product_id_idx").on(table.product_id),
    productFieldUnique: uniqueIndex("product_field_unique_idx").on(
      table.product_id,
      table.field_definition_id
    )
  })
);
export const selectCustomFieldValueSchema = createSelectSchema(
  customFieldValuesTable
);
export const createCustomFieldValueSchema = createInsertSchema(
  customFieldValuesTable
);
export const updateCustomFieldValueSchema = createUpdateSchema(
  customFieldValuesTable
);

// --- PROJECT & TODO SCHEMA ---
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

// --- SHOPPING CART SCHEMA ---
export const cartRoleEnum = pgEnum("cart_role", [
  "admin",
  "contributor",
  "viewer"
]);

export const cartsTable = pgTable(
  "carts",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull(),
    owner_user_id: text("owner_user_id").references(() => users.id, {
      onDelete: "cascade"
    }),
    guest_session_id: text("guest_session_id"),
    is_default: boolean("is_default").notNull().default(false),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    ownerIdx: index("carts_owner_idx").on(table.owner_user_id),
    guestIdx: index("carts_guest_idx").on(table.guest_session_id)
  })
);

export const cartCollaboratorsTable = pgTable(
  "cart_collaborators",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    cart_id: integer("cart_id")
      .notNull()
      .references(() => cartsTable.id, { onDelete: "cascade" }),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: cartRoleEnum("role").notNull().default("viewer"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    cartUserUnique: uniqueIndex("cart_user_unique_idx").on(
      table.cart_id,
      table.user_id
    ),
    cartIdx: index("collab_cart_idx").on(table.cart_id)
  })
);

// --- CART FOLDERS TABLE ---
export const cartFoldersTable = pgTable(
  "cart_folders",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    cart_id: integer("cart_id")
      .notNull()
      .references(() => cartsTable.id, { onDelete: "cascade" }),
    name: varchar({ length: 255 }).notNull(),
    // sort_order is relative to other folders and root items
    sort_order: integer("sort_order").notNull().default(0),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    cartIdx: index("cart_folders_cart_idx").on(table.cart_id)
  })
);

// --- CART TAGS TABLE (Tag Definitions) ---
export const cartTagsTable = pgTable(
  "cart_tags",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    cart_id: integer("cart_id")
      .notNull()
      .references(() => cartsTable.id, { onDelete: "cascade" }),
    name: varchar({ length: 100 }).notNull(), // The tag text
    color: varchar({ length: 7 }), // Optional: hex color e.g., "#FF0000"
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    cartIdx: index("cart_tags_cart_idx").on(table.cart_id),
    // Ensures tag names are unique *within* a single cart
    cartTagNameUnique: uniqueIndex("cart_tag_name_unique_idx").on(
      table.cart_id,
      table.name
    )
  })
);

// --- CART ITEM TAGS TABLE (Join Table) ---
export const cartItemTagsTable = pgTable(
  "cart_item_tags",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    cart_item_id: integer("cart_item_id")
      .notNull()
      .references(() => cartItemsTable.id, { onDelete: "cascade" }),
    cart_tag_id: integer("cart_tag_id")
      .notNull()
      .references(() => cartTagsTable.id, { onDelete: "cascade" }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    itemIdx: index("cart_item_tags_item_idx").on(table.cart_item_id),
    tagIdx: index("cart_item_tags_tag_idx").on(table.cart_tag_id),
    // Ensures a tag is only applied once to a specific item
    itemTagUnique: uniqueIndex("cart_item_tag_unique_idx").on(
      table.cart_item_id,
      table.cart_tag_id
    )
  })
);

// --- CART ITEMS TABLE ---
export const cartItemsTable = pgTable(
  "cart_items",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    cart_id: integer("cart_id")
      .notNull()
      .references(() => cartsTable.id, { onDelete: "cascade" }),
    product_id: integer("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull().default(1),
    price_snapshot: decimal("price_snapshot", {
      precision: 10,
      scale: 2
    }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
    notes: text("notes"),

    // Link to a folder (nullable)
    folder_id: integer("folder_id").references(
      () => cartFoldersTable.id,
      { onDelete: "set null" } // If folder is deleted, item moves to root
    ),
    // For DND sorting
    // If folder_id is NULL, sort_order is relative to root items/folders
    // If folder_id is NOT NULL, sort_order is relative to items in that folder
    sort_order: integer("sort_order").notNull().default(0),

    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    cartIdx: index("cart_items_cart_idx").on(table.cart_id),
    productIdx: index("cart_items_product_idx").on(table.product_id),
    folderIdx: index("cart_items_folder_idx").on(table.folder_id)
  })
);

// --- Zod Schemas ---

export const selectCartSchema = createSelectSchema(cartsTable);
export const createCartSchema = createInsertSchema(cartsTable).omit({
  created_at: true,
  updated_at: true
});
export const updateCartSchema = createUpdateSchema(cartsTable).omit({
  created_at: true
});

export const selectCartCollaboratorSchema = createSelectSchema(
  cartCollaboratorsTable
);
export const createCartCollaboratorSchema = createInsertSchema(
  cartCollaboratorsTable
);
export const updateCartCollaboratorSchema = createUpdateSchema(
  cartCollaboratorsTable
);

// NEW Schemas
export const selectCartFolderSchema = createSelectSchema(cartFoldersTable);
export const createCartFolderSchema = createInsertSchema(cartFoldersTable).omit(
  {
    created_at: true
  }
);
export const updateCartFolderSchema = createUpdateSchema(cartFoldersTable).omit(
  {
    created_at: true
  }
);

export const selectCartTagSchema = createSelectSchema(cartTagsTable);
export const createCartTagSchema = createInsertSchema(cartTagsTable).omit({
  created_at: true
});
export const updateCartTagSchema = createUpdateSchema(cartTagsTable).omit({
  created_at: true
});

export const selectCartItemTagSchema = createSelectSchema(cartItemTagsTable);
export const createCartItemTagSchema = createInsertSchema(
  cartItemTagsTable
).omit({
  created_at: true
});
// No update schema, as links are not updated

// MODIFIED Schemas
export const selectCartItemSchema = createSelectSchema(cartItemsTable);
export const createCartItemSchema = createInsertSchema(cartItemsTable).omit({
  created_at: true,
  updated_at: true
});
export const updateCartItemSchema = createUpdateSchema(cartItemsTable).omit({
  created_at: true
});

// --- Export Types ---
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

// Cart Types
export type Cart = z.infer<typeof selectCartSchema>;
export type CartItem = z.infer<typeof selectCartItemSchema>;
export type CartCollaborator = z.infer<typeof selectCartCollaboratorSchema>;
export const cartRoleSchema = z.enum(cartRoleEnum.enumValues);
export type CartRole = z.infer<typeof cartRoleSchema>;
export type CartFolder = z.infer<typeof selectCartFolderSchema>;
export type CartTag = z.infer<typeof selectCartTagSchema>;
export type CartItemTag = z.infer<typeof selectCartItemTagSchema>;
