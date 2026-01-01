import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import {
  selectTodoSchema,
  selectProjectSchema,
  selectUsersSchema,
  selectCompanySchema,
  selectCategorySchema,
  selectProductSchema,
  selectPricingTierSchema,
  selectAssetSchema,
  selectCustomFieldDefinitionSchema,
  selectCustomFieldValueSchema,
  selectCartSchema,
  selectCartCollaboratorSchema,
  selectUserAddressSchema,
  selectUserSelectedCartSchema,
  selectOrderSchema,
  selectUserSettingsSchema
} from "@/db/schema";
import { trpc } from "@/lib/trpc-client";

/**
 * Helper function to create full API URLs
 * @param path - The API path
 * @returns Full URL as a string
 */
export const createApiUrl = (path: string) => {
  return new URL(
    path,
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:5173"
  ).toString();
};

export const usersCollection = createCollection(
  electricCollectionOptions({
    id: "users",
    shapeOptions: {
      url: createApiUrl("/api/users"),
      parser: {
        timestamptz: (date: string) => {
          return new Date(date);
        }
      }
    },
    schema: selectUsersSchema,
    getKey: (item) => item.id
  })
);

export const companiesCollection = createCollection(
  electricCollectionOptions({
    id: "companies",
    shapeOptions: {
      url: createApiUrl("/api/companies"),
      parser: { timestamptz: (date: string) => new Date(date) }
    },
    schema: selectCompanySchema,
    getKey: (item) => item.id
    // ... onInsert, onUpdate, onDelete
  })
);

// --- Categories Collection ---
export const categoriesCollection = createCollection(
  electricCollectionOptions({
    id: "categories",
    shapeOptions: {
      url: createApiUrl("/api/categories"),
      parser: { timestamptz: (date: string) => new Date(date) }
    },
    schema: selectCategorySchema,
    getKey: (item) => item.id
    // ... onInsert, onUpdate, onDelete
  })
);

// --- Products Collection ---
export const productsCollection = createCollection(
  electricCollectionOptions({
    id: "products",
    shapeOptions: {
      url: createApiUrl("/api/products"),
      parser: { timestamptz: (date: string) => new Date(date) }
    },
    schema: selectProductSchema,
    getKey: (item) => item.id
    // ... onInsert, onUpdate, onDelete
  })
);

// --- Pricing Tiers Collection ---
export const pricingTiersCollection = createCollection(
  electricCollectionOptions({
    id: "pricing_tiers",
    shapeOptions: { url: createApiUrl("/api/pricing-tiers") },
    schema: selectPricingTierSchema,
    getKey: (item) => item.id
    // ... onInsert, onUpdate, onDelete
  })
);

// --- Assets Collection ---
export const assetsCollection = createCollection(
  electricCollectionOptions({
    id: "assets",
    shapeOptions: {
      url: createApiUrl("/api/assets"),
      parser: { timestamptz: (date: string) => new Date(date) }
    },
    schema: selectAssetSchema,
    getKey: (item) => item.id
    // ... onInsert, onUpdate, onDelete
  })
);

// --- Custom Field Definitions Collection ---
export const customFieldDefinitionsCollection = createCollection(
  electricCollectionOptions({
    id: "custom_field_definitions",
    shapeOptions: { url: createApiUrl("/api/custom-field-definitions") },
    schema: selectCustomFieldDefinitionSchema,
    getKey: (item) => item.id
    // ... onInsert, onUpdate, onDelete
  })
);

// --- Custom Field Values Collection ---
export const customFieldValuesCollection = createCollection(
  electricCollectionOptions({
    id: "custom_field_values",
    shapeOptions: { url: createApiUrl("/api/custom-field-values") },
    schema: selectCustomFieldValueSchema,
    getKey: (item) => item.id
    // ... onInsert, onUpdate, onDelete
  })
);

export const projectCollection = createCollection(
  electricCollectionOptions({
    id: "projects",
    shapeOptions: {
      url: createApiUrl("/api/projects"),
      parser: {
        timestamptz: (date: string) => {
          return new Date(date);
        }
      }
    },
    schema: selectProjectSchema,
    getKey: (item) => item.id,
    onInsert: async ({ transaction }) => {
      const { modified: newProject } = transaction.mutations[0];
      const result = await trpc.projects.create.mutate({
        name: newProject.name,
        description: newProject.description,
        owner_id: newProject.owner_id,
        shared_user_ids: newProject.shared_user_ids
      });

      return { txid: result.txid };
    },
    onUpdate: async ({ transaction }) => {
      const { modified: updatedProject } = transaction.mutations[0];
      const result = await trpc.projects.update.mutate({
        id: updatedProject.id,
        data: {
          name: updatedProject.name,
          description: updatedProject.description,
          shared_user_ids: updatedProject.shared_user_ids
        }
      });

      return { txid: result.txid };
    },
    onDelete: async ({ transaction }) => {
      const { original: deletedProject } = transaction.mutations[0];
      const result = await trpc.projects.delete.mutate({
        id: deletedProject.id
      });

      return { txid: result.txid };
    }
  })
);

// --- Carts Collection ---
export const cartsCollection = createCollection(
  electricCollectionOptions({
    id: "carts",
    shapeOptions: {
      url: createApiUrl("/api/carts"),
      parser: { timestamptz: (date: string) => new Date(date) }
    },
    schema: selectCartSchema,
    getKey: (item) => item.id,
    onInsert: async ({ transaction }) => {
      const { modified: newCart } = transaction.mutations[0];
      const result = await trpc.carts.create.mutate({
        name: newCart.name,
        created_by_id: newCart.created_by_id
      });

      return { txid: result.txid };
    },
    onUpdate: async ({ transaction }) => {
      const { modified: updatedCart } = transaction.mutations[0];
      const result = await trpc.carts.update.mutate({
        id: updatedCart.id,
        data: {
          name: updatedCart.name,
          created_by_id: updatedCart.created_by_id
        }
      });

      return { txid: result.txid };
    },
    onDelete: async ({ transaction }) => {
      const { original: deletedCart } = transaction.mutations[0];
      const result = await trpc.carts.delete.mutate({ id: deletedCart.id });

      return { txid: result.txid };
    }
  })
);

// --- Cart Collaborators Collection ---
export const cartCollaboratorsCollection = createCollection(
  electricCollectionOptions({
    id: "cart_collaborators",
    shapeOptions: {
      url: createApiUrl("/api/cart-collaborators"),
      parser: { timestamptz: (date: string) => new Date(date) }
    },
    schema: selectCartCollaboratorSchema,
    getKey: (item) => item.id,
    onInsert: async ({ transaction }) => {
      const { modified: newCollab } = transaction.mutations[0];
      const result = await trpc.cartCollaborators.create.mutate({
        cart_id: newCollab.cart_id,
        user_id: newCollab.user_id,
        role: newCollab.role
      });

      return { txid: result.txid };
    },
    onUpdate: async ({ transaction }) => {
      const { modified: updatedCollab } = transaction.mutations[0];
      const result = await trpc.cartCollaborators.update.mutate({
        id: updatedCollab.id,
        data: {
          role: updatedCollab.role
        }
      });

      return { txid: result.txid };
    },
    onDelete: async ({ transaction }) => {
      const { original: deletedCollab } = transaction.mutations[0];
      const result = await trpc.cartCollaborators.delete.mutate({
        id: deletedCollab.id
      });

      return { txid: result.txid };
    }
  })
);

// --- User Selected Cart Collection ---
export const userSelectedCartCollection = createCollection(
  electricCollectionOptions({
    id: "user_selected_cart",
    shapeOptions: {
      url: createApiUrl("/api/user-selected-cart"),
      parser: { timestamptz: (date: string) => new Date(date) }
    },
    schema: selectUserSelectedCartSchema,
    getKey: (item) => item.user_id,
    onInsert: async ({ transaction }) => {
      const { modified: newSelection } = transaction.mutations[0];
      const result = await trpc.userSelectedCart.set.mutate({
        cart_id: newSelection.cart_id
      });
      return { txid: result.txid };
    },
    onUpdate: async ({ transaction }) => {
      const { modified: updatedSelection } = transaction.mutations[0];
      const result = await trpc.userSelectedCart.set.mutate({
        cart_id: updatedSelection.cart_id
      });
      return { txid: result.txid };
    }
  })
);

export const todoCollection = createCollection(
  electricCollectionOptions({
    id: "todos",
    shapeOptions: {
      url: createApiUrl("/api/todos"),
      parser: {
        // Parse timestamp columns into JavaScript Date objects
        timestamptz: (date: string) => {
          return new Date(date);
        }
      }
    },
    schema: selectTodoSchema,
    getKey: (item) => item.id,
    onInsert: async ({ transaction }) => {
      const { modified: newTodo } = transaction.mutations[0];
      const result = await trpc.todos.create.mutate({
        user_id: newTodo.user_id,
        text: newTodo.text,
        completed: newTodo.completed,
        project_id: newTodo.project_id,
        user_ids: newTodo.user_ids
      });

      return { txid: result.txid };
    },
    onUpdate: async ({ transaction }) => {
      const { modified: updatedTodo } = transaction.mutations[0];
      const result = await trpc.todos.update.mutate({
        id: updatedTodo.id,
        data: {
          text: updatedTodo.text,
          completed: updatedTodo.completed
        }
      });

      return { txid: result.txid };
    },
    onDelete: async ({ transaction }) => {
      const { original: deletedTodo } = transaction.mutations[0];
      const result = await trpc.todos.delete.mutate({
        id: deletedTodo.id
      });

      return { txid: result.txid };
    }
  })
);

// --- User Addresses Collection ---
export const userAddressesCollection = createCollection(
  electricCollectionOptions({
    id: "user_addresses",
    shapeOptions: {
      url: createApiUrl("/api/addresses"),
      parser: { timestamptz: (date: string) => new Date(date) }
    },
    schema: selectUserAddressSchema,
    getKey: (item) => item.id,
    onInsert: async ({ transaction }) => {
      const { modified: newAddress } = transaction.mutations[0];
      const result = await trpc.addresses.create.mutate({
        ...newAddress
      });

      return { txid: result.txid };
    },
    onUpdate: async ({ transaction }) => {
      const { modified: updatedAddress } = transaction.mutations[0];
      const result = await trpc.addresses.update.mutate({
        id: updatedAddress.id,
        data: {
          ...updatedAddress
        }
      });

      return { txid: result.txid };
    },
    onDelete: async ({ transaction }) => {
      const { original: deletedAddress } = transaction.mutations[0];
      const result = await trpc.addresses.delete.mutate({
        id: deletedAddress.id
      });

      return { txid: result.txid };
    }
  })
);

export const ordersCollection = createCollection(
  electricCollectionOptions({
    id: "orders",
    shapeOptions: {
      url: createApiUrl("/api/orders"),
      parser: { timestamptz: (date: string) => new Date(date) }
    },
    schema: selectOrderSchema,
    getKey: (item) => item.id
  })
);

export const userSettingsCollection = createCollection(
  electricCollectionOptions({
    id: "user_settings",
    shapeOptions: {
      url: createApiUrl("/api/user-settings"),
      parser: {
        timestamptz: (date: string) => new Date(date)
      }
    },
    schema: selectUserSettingsSchema,
    getKey: (item) => item.user_id,

    onUpdate: async ({ transaction }) => {
      const { modified } = transaction.mutations[0];

      // We use the upsert mutation for updates
      const result = await trpc.userSettings.upsert.mutate({
        ...modified
      });
      return { txid: result.txid };
    },

    // Handle case where user creates settings for the first time via the UI
    onInsert: async ({ transaction }) => {
      const { modified } = transaction.mutations[0];
      const result = await trpc.userSettings.upsert.mutate({
        ...modified
      });
      return { txid: result.txid };
    }
  })
);
