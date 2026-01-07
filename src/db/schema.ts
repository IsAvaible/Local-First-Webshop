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
  uniqueIndex,
  customType,
  primaryKey,
  uuid,
  date
} from "drizzle-orm/pg-core";
import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod";
export * from "./auth-schema";
import { users } from "./auth-schema";
import { sql } from "drizzle-orm";
import type { TypedMap, TypedArray } from "yjs-types";
import type { Tag } from "@/contexts/useCartContext.ts";

const { createInsertSchema, createSelectSchema, createUpdateSchema } =
  createSchemaFactory({ zodInstance: z });

// Y-Electric Tables
// Custom type for Postgres bytea
const bytea = customType<{ data: Buffer; driverData: string }>({
  dataType() {
    return "bytea";
  },
  toDriver(value: Buffer): string {
    // Convert Buffer to hex string for the driver
    return `\\x${value.toString("hex")}`;
  },
  fromDriver(value: string): Buffer {
    // Convert hex string (e.g., \x... or just ...) back to Buffer
    const hex = value.startsWith("\\x") ? value.substring(2) : value;
    return Buffer.from(hex, "hex");
  }
});

// Table for Yjs document updates
export const ydocUpdatesTable = pgTable("ydoc_updates", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  room: text("room").notNull(),
  update: bytea("update").notNull()
});

export const updateYdocSchema = createInsertSchema(ydocUpdatesTable);

// Table for Yjs awareness updates
export const ydocAwarenessTable = pgTable(
  "ydoc_awareness",
  {
    client_id: text("client_id").notNull(),
    room: text("room").notNull(),
    update: bytea("update").notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => [primaryKey({ columns: [table.client_id, table.room] })]
);

export const updateYdocAwarenessSchema = createInsertSchema(ydocAwarenessTable);

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
  blur_hash: varchar({ length: 50 }),
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
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar({ length: 255 }).notNull(),
    created_by_id: text("created_by_id").references(() => users.id, {
      onDelete: "cascade"
    }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    ownerIdx: index("carts_created_by_id_idx").on(table.created_by_id)
  })
);

export const cartCollaboratorsTable = pgTable(
  "cart_collaborators",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cart_id: uuid("cart_id")
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

// --- USER SELECTED CART SCHEMA ---

export const userSelectedCartTable = pgTable(
  "user_selected_cart",
  {
    user_id: text("user_id")
      .primaryKey()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    cart_id: uuid("cart_id")
      .notNull()
      .references(() => cartsTable.id, { onDelete: "cascade" }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    cartIdIdx: index("user_selected_cart_cart_id_idx").on(table.cart_id)
  })
);

export const selectUserSelectedCartSchema = createSelectSchema(
  userSelectedCartTable
);
export const createUserSelectedCartSchema = createInsertSchema(
  userSelectedCartTable
).omit({
  created_at: true,
  updated_at: true
});
export const updateUserSelectedCartSchema = createUpdateSchema(
  userSelectedCartTable
).omit({
  created_at: true,
  updated_at: true
});

// --- YJS TYPES (The Document State) ---

// Common fields for all nodes
type BaseNodeShape = {
  id: string;
  parent_id: string | null; // null = root
  order: string; // Fractional index key
};

// Item specific fields
export type YCartItemShape = BaseNodeShape & {
  type: "item";
  product_id: number;
  quantity: number;
  price_snapshot: string;
  tag_ids: string[];
  notes: string | null;
  created_at: number;
};

// Folder specific fields
export type YCartFolderShape = BaseNodeShape & {
  type: "folder";
  name: string;
};

// The Union Type representing the raw JSON data
export type YCartNodeShape = YCartItemShape | YCartFolderShape;

export type YSnapshotDelta = {
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  summary: string;
};

export type YCartSnapshotShape = {
  id: string;
  timestamp: number;
  snapshot: Uint8Array;
  restoredFromId?: string;
  meta: {
    summary: string;
    delta: YSnapshotDelta;
    authors: string[];
  };
};

// --- Yjs Specific Types ---
// These wrap the JSON shapes into Yjs TypedMaps
export type YCartNodeMap = TypedMap<YCartNodeShape>;
export type YTagMap = TypedMap<Tag>;
export type YSnapshotList = TypedArray<YCartSnapshotShape>;

// Type Guards for narrowing the union
export function isYItem(node: YCartNodeShape): node is YCartItemShape {
  return node.type === "item";
}

export function isYFolder(node: YCartNodeShape): node is YCartFolderShape {
  return node.type === "folder";
}

// Helper to safely check type on a Y.Map without full JSON conversion
export function isYItemMap(map: YCartNodeMap): map is TypedMap<YCartItemShape> {
  return map.get("type") === "item";
}

export function isYFolderMap(
  map: YCartNodeMap
): map is TypedMap<YCartFolderShape> {
  return map.get("type") === "folder";
}

// --- Export Types ---
export type YdocUpdate = z.infer<typeof updateYdocSchema>;
export type YdocAwarenessUpdate = z.infer<typeof updateYdocAwarenessSchema>;
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
export type CartCollaborator = z.infer<typeof selectCartCollaboratorSchema>;
export const cartRoleSchema = z.enum(cartRoleEnum.enumValues);
export type CartRole = z.infer<typeof cartRoleSchema>;
export type UserSelectedCart = z.infer<typeof selectUserSelectedCartSchema>;

// --- USER SETTINGS SCHEMA ---

export const userSettingsTable = pgTable("user_settings", {
  user_id: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),

  // Personal Info
  first_name: text("first_name"),
  last_name: text("last_name"),
  phone_number: text("phone_number"),
  birthday: date("birthday"),

  // Notifications
  notify_order_updates: boolean("notify_order_updates").notNull().default(true),
  notify_newsletter: boolean("notify_newsletter").notNull().default(false),
  notify_price_changes: boolean("notify_price_changes").notNull().default(true),

  // Localization
  currency: varchar("currency", { length: 3 }).notNull().default("EUR"), // ISO 4217
  language: varchar("language", { length: 10 }).notNull().default("en"), // ISO 639-1

  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});

export const selectUserSettingsSchema = createSelectSchema(userSettingsTable);
export const createUserSettingsSchema = createInsertSchema(
  userSettingsTable
).omit({
  updated_at: true
});
export const updateUserSettingsSchema = createUpdateSchema(
  userSettingsTable
).omit({
  updated_at: true
});

export type UserSettings = z.infer<typeof selectUserSettingsSchema>;
export type CreateUserSettings = z.infer<typeof createUserSettingsSchema>;
export type UpdateUserSettings = z.infer<typeof updateUserSettingsSchema>;

// --- USER ADDRESS SCHEMA ---

export const userAddressesTable = pgTable(
  "user_addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipient_name: text("recipient_name").notNull(),
    company_name: text("company_name"),
    country_code: text("country_code").notNull(),
    state: text("state"),
    city: text("city").notNull(),
    zip_code: text("zip_code").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    phone_number: text("phone_number"),
    email_address: text("email"),
    is_default_delivery: boolean("is_default_delivery")
      .notNull()
      .default(false),
    is_default_billing: boolean("is_default_billing").notNull().default(false),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => ({
    userIdIdx: index("user_addresses_user_id_idx").on(table.user_id),
    oneDefaultDeliveryPerUser: uniqueIndex("one_default_delivery_per_user_idx")
      .on(table.user_id)
      .where(sql`${table.is_default_delivery} = true`),
    oneDefaultBillingPerUser: uniqueIndex("one_default_billing_per_user_idx")
      .on(table.user_id)
      .where(sql`${table.is_default_billing} = true`)
  })
);

export const selectUserAddressSchema = createSelectSchema(userAddressesTable);
export const createUserAddressSchema = createInsertSchema(
  userAddressesTable
).omit({
  created_at: true,
  updated_at: true
});
export const updateUserAddressSchema = createUpdateSchema(
  userAddressesTable
).omit({
  created_at: true,
  updated_at: true
});

export type UserAddress = z.infer<typeof selectUserAddressSchema>;
export type CreateUserAddress = z.infer<typeof createUserAddressSchema>;
export type UpdateUserAddress = z.infer<typeof updateUserAddressSchema>;

// --- ORDERS SCHEMA ---

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "awaiting_payment",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded"
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "paid",
  "refunded",
  "partially_refunded",
  "failed",
  "requires_manual_review"
]);

export const ordersTable = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Human readable ID (e.g. ORD-1001)
    order_number: varchar({ length: 50 }).notNull().unique(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    // Financials
    // Storing as decimal strings for precision
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
    tax_total: decimal("tax_total", { precision: 12, scale: 2 })
      .notNull()
      .default("0.00"),
    shipping_total: decimal("shipping_total", { precision: 12, scale: 2 })
      .notNull()
      .default("0.00"),
    discount_total: decimal("discount_total", { precision: 12, scale: 2 })
      .notNull()
      .default("0.00"),
    grand_total: decimal("grand_total", { precision: 12, scale: 2 }).notNull(),
    currency_code: varchar({ length: 3 }).notNull().default("EUR"),

    // Status
    status: orderStatusEnum("status").notNull().default("pending"),
    payment_status: paymentStatusEnum("payment_status")
      .notNull()
      .default("unpaid"),
    payment_failed_reason: varchar({ length: 255 }),
    payment_method: varchar({ length: 50 }),
    transaction_id: varchar({ length: 100 }).notNull().unique(), // Stripe intent id
    stripe_client_secret: varchar({ length: 255 }),
    cart_id: uuid("cart_id").references(() => cartsTable.id, {
      onDelete: "set null"
    }),

    // Logistics
    shipping_carrier: varchar({ length: 100 }),
    tracking_number: varchar({ length: 100 }),

    // Address Snapshots (JSONB to preserve history)
    shipping_address_snapshot: jsonb("shipping_address_snapshot").notNull(),
    billing_address_snapshot: jsonb("billing_address_snapshot").notNull(),

    // Metadata
    notes: text("notes"),

    // Timestamps
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    paid_at: timestamp({ withTimezone: true }),
    shipped_at: timestamp({ withTimezone: true }),
    cancelled_at: timestamp({ withTimezone: true })
  },
  (table) => ({
    userIdIdx: index("orders_user_id_idx").on(table.user_id),
    orderNumberIdx: uniqueIndex("orders_order_number_idx").on(
      table.order_number
    )
  })
);

export const selectOrderSchema = createSelectSchema(ordersTable);
// Omit generated/audit fields for creation
export const createOrderSchema = createInsertSchema(ordersTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
  paid_at: true,
  shipped_at: true,
  cancelled_at: true
});
export const updateOrderSchema = createUpdateSchema(ordersTable).omit({
  created_at: true,
  updated_at: true
});

// --- ORDER ITEMS SCHEMA ---

export const orderItemsTable = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    order_id: uuid("order_id")
      .notNull()
      .references(() => ordersTable.id, { onDelete: "cascade" }),

    product_id: integer("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "restrict" }),

    // Snapshot product details in case product is deleted/changed later
    product_name_snapshot: varchar({ length: 255 }).notNull(),

    quantity: integer("quantity").notNull().default(1),

    // Price per unit at the moment of purchase
    price_per_unit: decimal("price_per_unit", {
      precision: 12,
      scale: 2
    }).notNull(),

    // (quantity * price) - line_item_discount
    total_price: decimal("total_price", { precision: 12, scale: 2 }).notNull()
  },
  (table) => ({
    orderIdIdx: index("order_items_order_id_idx").on(table.order_id)
  })
);

export const selectOrderItemSchema = createSelectSchema(orderItemsTable);
export const createOrderItemSchema = createInsertSchema(orderItemsTable).omit({
  id: true
});

// Types export
export type Order = z.infer<typeof selectOrderSchema>;
export type CreateOrder = z.infer<typeof createOrderSchema>;
export type OrderItem = z.infer<typeof selectOrderItemSchema>;
export type CreateOrderItem = z.infer<typeof createOrderItemSchema>;

// --- WISHLIST SCHEMA ---
export const wishlistTable = pgTable(
  "wishlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    product_id: integer()
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    price_snapshot: decimal("price_snapshot", {
      precision: 10,
      scale: 2
    }).notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userIdIdx: index("wishlist_user_id_idx").on(table.user_id),
    productIdIdx: index("wishlist_product_id_idx").on(table.product_id),
    // Ensure a user can't have the same product in their wishlist multiple times
    userProductUnique: uniqueIndex("wishlist_user_product_unique_idx").on(
      table.user_id,
      table.product_id
    )
  })
);

export const selectWishlistSchema = createSelectSchema(wishlistTable);
export const createWishlistSchema = createInsertSchema(wishlistTable).omit({
  created_at: true
});
export const updateWishlistSchema = createUpdateSchema(wishlistTable).omit({
  created_at: true
});

export type Wishlist = z.infer<typeof selectWishlistSchema>;
export type CreateWishlist = z.infer<typeof createWishlistSchema>;
export type UpdateWishlist = z.infer<typeof updateWishlistSchema>;

// --- NOTIFICATIONS SCHEMA ---
export const notificationCategoryEnum = pgEnum("notification_category", [
  "order", // Transactional updates
  "shipping", // Logistics and delivery
  "payment", // Billing and refunds
  "account", // Security and profile
  "marketing", // Promos and newsletters
  "inventory", // Stock and price alerts
  "social", // Reviews, cart sharing
  "system" // Maintenance, terms updates
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  // Order Events
  "order_confirmation",
  "order_cancelled",
  "order_item_unavailable",

  // Shipping Events
  "shipment_dispatched",
  "shipment_out_for_delivery",
  "shipment_delivered",
  "shipment_delayed",
  "pickup_ready",

  // Payment Events
  "payment_failed",
  "payment_succeeded",
  "refund_processed",
  "invoice_available",

  // Inventory/Product Events
  "price_drop",
  "back_in_stock",
  "low_stock_alert",

  // Social/Collaboration Events
  "cart_shared",
  "cart_collaborator_add",

  // Marketing Events
  "promo_code",
  "flash_sale_start",
  "abandoned_cart_reminder",
  "recommendation",

  // Account/Security Events
  "welcome",
  "password_changed",
  "new_device_login"
]);

export const notificationsTable = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actor_id: text("actor_id").references(() => users.id, {
      onDelete: "set null"
    }),

    // Batching logic (e.g., "cart_123_likes")
    group_key: text("group_key"),

    category: notificationCategoryEnum("category").notNull(),
    type: notificationTypeEnum("type").notNull(),

    // this would not work with localization
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body").notNull(),

    route: text("route"),
    route_params: jsonb("route_params"),
    search_params: jsonb("search_params"),

    // Specific icons are only used in edge cases, most of the time derived from type
    icon: varchar("icon", { length: 50 }),

    // Status tracking
    seen_at: timestamp("seen_at", { withTimezone: true }),
    read_at: timestamp("read_at", { withTimezone: true }),
    clicked_at: timestamp("clicked_at", { withTimezone: true }),

    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expires_at: timestamp("expires_at", { withTimezone: true })
  },
  (table) => ({
    userIdIdx: index("notifications_user_id_idx").on(table.user_id)
  })
);

export const selectNotificationSchema = createSelectSchema(notificationsTable);
export const createNotificationSchema = createInsertSchema(
  notificationsTable
).omit({
  id: true,
  created_at: true
});
export const updateNotificationSchema = createUpdateSchema(notificationsTable);

export type Notification = z.infer<typeof selectNotificationSchema>;
export type CreateNotification = z.infer<typeof createNotificationSchema>;
export type UpdateNotification = z.infer<typeof updateNotificationSchema>;
export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];
