import { db } from "@/db/connection";
import * as schema from "@/db/schema";
import { ydocUpdatesTable } from "@/db/schema";
import { eq, and, exists, sql } from "drizzle-orm";

// ----------------------------------------------------------------------------
// 1. MIGRATION MANIFEST TYPES
// ----------------------------------------------------------------------------
// This section analyzes the Drizzle schema to identify tables that
// contain user-ownership columns (e.g., `user_id`). It constructs a manifest
// type to ensure that every user-owned table has a corresponding migration handler,
// enforcing type safety and completeness in the migration logic. #ILoveTS

type Schema = typeof schema;

// Heuristic: specific columns that indicate user ownership
// This is not guaranteed to be exhaustive!
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HasUserColumn<T> = T extends { user_id: any }
  ? true
  : // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends { created_by_id: any }
    ? true
    : false;

// Extract keys of tables that require migration
type UserTableKeys = {
  [K in keyof Schema]: HasUserColumn<Schema[K]> extends true ? K : never;
}[keyof Schema];

// Enforce that every extracted key has a handler function
type MigrationManifest = Record<
  UserTableKeys,
  (
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    anonId: string,
    newId: string
  ) => Promise<void>
>;

// ----------------------------------------------------------------------------
// 2. MIGRATION HANDLERS
// ----------------------------------------------------------------------------

const migrationHandlers: MigrationManifest = {
  // 1. Carts Logic
  cartsTable: async (tx, anonId, newId) => {
    // 1.1. Update creator for carts that have activity (ydoc_updates)
    await tx
      .update(schema.cartsTable)
      .set({ created_by_id: newId })
      .where(
        and(
          eq(schema.cartsTable.created_by_id, anonId),
          exists(
            tx
              .select()
              .from(ydocUpdatesTable)
              .where(
                eq(ydocUpdatesTable.room, sql`${schema.cartsTable.id}::text`)
              )
          )
        )
      );

    // 1.2. Delete the remaining empty carts belonging to the anonymous user
    await tx
      .delete(schema.cartsTable)
      .where(eq(schema.cartsTable.created_by_id, anonId));
  },

  // 2. Collaborators Logic
  cartCollaboratorsTable: async (tx, anonId, newId) => {
    const anonCollabs = await tx
      .select()
      .from(schema.cartCollaboratorsTable)
      .where(eq(schema.cartCollaboratorsTable.user_id, anonId));

    for (const collab of anonCollabs) {
      // Check if target user is already on this cart
      const [existing] = await tx
        .select()
        .from(schema.cartCollaboratorsTable)
        .where(
          and(
            eq(schema.cartCollaboratorsTable.cart_id, collab.cart_id),
            eq(schema.cartCollaboratorsTable.user_id, newId)
          )
        );

      if (!existing) {
        // Move collaboration
        await tx
          .update(schema.cartCollaboratorsTable)
          .set({ user_id: newId })
          .where(eq(schema.cartCollaboratorsTable.id, collab.id));
      } else {
        // Redundant, delete
        await tx
          .delete(schema.cartCollaboratorsTable)
          .where(eq(schema.cartCollaboratorsTable.id, collab.id));
      }
    }
  },

  // 3. Selected Cart Logic
  userSelectedCartTable: async (tx, anonId, newId) => {
    const [anonSelection] = await tx
      .select()
      .from(schema.userSelectedCartTable)
      .where(eq(schema.userSelectedCartTable.user_id, anonId));

    if (anonSelection) {
      const [existingSelection] = await tx
        .select()
        .from(schema.userSelectedCartTable)
        .where(eq(schema.userSelectedCartTable.user_id, newId));

      if (!existingSelection) {
        await tx
          .update(schema.userSelectedCartTable)
          .set({ user_id: newId })
          .where(eq(schema.userSelectedCartTable.user_id, anonId));
      }
      // If existing selection, we implicitly drop the anonymous selection
    }
  },

  // 4. Addresses Logic
  userAddressesTable: async (tx, anonId, newId) => {
    const anonAddresses = await tx
      .select()
      .from(schema.userAddressesTable)
      .where(eq(schema.userAddressesTable.user_id, anonId));

    for (const address of anonAddresses) {
      const updates: {
        user_id: string;
        is_default_delivery?: boolean;
        is_default_billing?: boolean;
      } = { user_id: newId };

      // Handle default flags conflicts
      if (address.is_default_delivery) {
        const [existingDefault] = await tx
          .select()
          .from(schema.userAddressesTable)
          .where(
            and(
              eq(schema.userAddressesTable.user_id, newId),
              eq(schema.userAddressesTable.is_default_delivery, true)
            )
          );
        if (existingDefault) updates.is_default_delivery = false;
      }

      if (address.is_default_billing) {
        const [existingDefault] = await tx
          .select()
          .from(schema.userAddressesTable)
          .where(
            and(
              eq(schema.userAddressesTable.user_id, newId),
              eq(schema.userAddressesTable.is_default_billing, true)
            )
          );
        if (existingDefault) updates.is_default_billing = false;
      }

      await tx
        .update(schema.userAddressesTable)
        .set(updates)
        .where(eq(schema.userAddressesTable.id, address.id));
    }
  },

  // 5. Settings Logic
  userSettingsTable: async (tx, anonId, newId) => {
    const [anonSettings] = await tx
      .select()
      .from(schema.userSettingsTable)
      .where(eq(schema.userSettingsTable.user_id, anonId));

    if (anonSettings) {
      await tx
        .update(schema.userSettingsTable)
        .set({
          ...anonSettings,
          user_id: newId,
          updated_at: new Date()
        })
        .where(eq(schema.userSettingsTable.user_id, newId));
    }
  },

  // 6. Orders Logic
  ordersTable: async (tx, anonId, newId) => {
    await tx
      .update(schema.ordersTable)
      .set({ user_id: newId })
      .where(eq(schema.ordersTable.user_id, anonId));
  },

  // 7. Wishlist Logic
  wishlistTable: async (tx, anonId, newId) => {
    const anonWishlist = await tx
      .select()
      .from(schema.wishlistTable)
      .where(eq(schema.wishlistTable.user_id, anonId));

    for (const item of anonWishlist) {
      const [existing] = await tx
        .select()
        .from(schema.wishlistTable)
        .where(
          and(
            eq(schema.wishlistTable.user_id, newId),
            eq(schema.wishlistTable.product_id, item.product_id)
          )
        );

      if (existing) {
        // Delete duplicate
        await tx
          .delete(schema.wishlistTable)
          .where(eq(schema.wishlistTable.id, item.id));
      } else {
        // Move item
        await tx
          .update(schema.wishlistTable)
          .set({ user_id: newId })
          .where(eq(schema.wishlistTable.id, item.id));
      }
    }
  },

  // 8. Notifications Logic
  notificationsTable: async (tx, anonId, newId) => {
    await tx
      .update(schema.notificationsTable)
      .set({ user_id: newId })
      .where(eq(schema.notificationsTable.user_id, anonId));
  }
};

// ----------------------------------------------------------------------------
// 3. MAIN EXPORT
// ----------------------------------------------------------------------------
export async function moveAnonymousUserData(anonId: string, newId: string) {
  await db.transaction(async (tx) => {
    for (const key of Object.keys(
      migrationHandlers
    ) as (keyof MigrationManifest)[]) {
      await migrationHandlers[key](tx, anonId, newId);
    }
  });
}
